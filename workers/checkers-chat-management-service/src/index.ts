import { WorkerEntrypoint } from "cloudflare:workers";
import { Hono } from "hono";
import { handleEvalRequest } from "./dev";
import { runFaqSweep } from "./sweep";
import { resolveReplyTarget, resolveTopicId } from "./telegram";
import type { TelegramMessage, TelegramUpdate } from "./types";

/**
 * checkers-chat-management-service
 *
 * Watches the checkers community group chat, records what is said, and answers
 * recurring questions from an approved FAQ set.
 *
 * The webhook only records. All thinking — classification, the decision to
 * speak, the reply itself — happens on the cron (see runFaqSweep), so humans
 * get first crack at every question and a message answered by a colleague
 * within the grace period never costs a model call.
 */

const app = new Hono<{ Bindings: Env }>();

app.get("/", c => c.json({ status: "healthy", service: "checkers-chat-management-service" }));

/**
 * Local prompt testing. 404s unless ENABLE_EVAL_ENDPOINT is set, which happens
 * only in .dev.vars — see src/dev.ts.
 */
app.post("/dev/classify", handleEvalRequest);

/**
 * Telegram webhook for the admin bot.
 *
 * Raw parse rather than grammy's webhookCallback: this endpoint dispatches no
 * commands, it only records what was said.
 */
app.post("/telegram-admin", async c => {
  const env = c.env;

  // Checked separately: an unset secret would make the comparison below
  // undefined !== undefined, i.e. false, and accept anonymous callers. The
  // secrets workflow only warns when a GitHub secret is missing, so an
  // unconfigured deploy is a real possibility rather than a theoretical one.
  if (!env.TELEGRAM_ADMIN_WEBHOOK_SECRET) {
    console.error("TELEGRAM_ADMIN_WEBHOOK_SECRET is not configured; rejecting all calls");
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (c.req.header("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_ADMIN_WEBHOOK_SECRET) {
    console.warn("Rejected webhook call with bad or missing secret token");
    return c.json({ error: "Unauthorized" }, 401);
  }

  let update: TelegramUpdate;
  try {
    update = await c.req.json<TelegramUpdate>();
  } catch {
    // Nothing to retry: a body that will not parse now will not parse later.
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!update.message) return c.json({ ok: true });

  try {
    await recordMessage(env, update.message);
  } catch (error) {
    // Return non-2xx so Telegram redelivers. The write upserts on
    // (chatId, messageId), so a retry cannot duplicate the row — and losing the
    // message would leave a permanent, invisible gap in the analysis corpus.
    console.error("Failed to record message, asking Telegram to retry:", error);
    return c.json({ error: "Ingest failed" }, 500);
  }

  return c.json({ ok: true });
});

/** Store a group message. No classification here — that is the cron's job. */
async function recordMessage(env: Env, message: TelegramMessage): Promise<void> {
  // The webhook is registered against the bot token, not a chat, so this
  // endpoint receives every update the admin bot sees: DMs, other groups,
  // channels it was added to. Only the checkers group is ours.
  if (String(message.chat.id) !== env.CHECKERS_CHAT_ID) {
    // Logged, not silent: if the admin bot is doing something else somewhere,
    // this is how you find out that registering a webhook here took over its
    // updates. Telegram allows only one webhook per token.
    console.log(`Ignoring message from unrelated chat ${message.chat.id} (${message.chat.type})`);
    return;
  }

  // Bots include this bot: its own replies must never be recorded as human
  // activity, or a reply would look like someone answering and suppress the next.
  if (!message.from || message.from.is_bot) return;

  // Service messages (forum_topic_created and friends) carry no text.
  const text = message.text?.trim();
  if (!text) return;

  const result = await env.CHECKERS_DB_SERVICE.upsertChatMessage({
    chatId: env.CHECKERS_CHAT_ID,
    messageId: message.message_id,
    messageThreadId: resolveTopicId(message),
    telegramId: String(message.from.id),
    telegramUsername: message.from.username ?? null,
    name: message.from.first_name ?? null,
    text,
    sentAt: new Date(message.date * 1000),
    replyToMessageId: resolveReplyTarget(message),
    faqProcessedAt: null,
    faqOutcome: null,
    answeredWithFaqId: null,
  });

  if (!result.success) {
    throw new Error(`upsertChatMessage failed: ${result.error}`);
  }
}

export default class extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    return app.fetch(request, this.env, this.ctx);
  }

  async scheduled(_controller: ScheduledController) {
    await runFaqSweep(this.env);
  }
}
