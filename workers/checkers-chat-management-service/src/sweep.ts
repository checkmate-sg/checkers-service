import { Bot } from "grammy";
import { getParameters } from "@/shared/helpers/parameters";
import { assessQuestion, matchFaq } from "./classify";
import { loadFaqs } from "./faq";
import type { CandidateMessage, FollowingMessage } from "./types";

/**
 * The FAQ sweep: find questions the group has left unanswered, and answer the
 * ones our FAQ covers.
 *
 * Runs on a cron rather than per-message so humans get first crack at every
 * question, repeat askers collapse into one reply, and the bot never interrupts
 * a live conversation. Nothing is classified at ingest time — a message that a
 * colleague answers within the grace period never costs a model call at all.
 */

/** Model calls per run. Bounds spend if the chat ever gets unexpectedly busy. */
const MAX_CLASSIFICATIONS_PER_RUN = 10;

/** Replies posted per run, so the bot never dumps a wall of messages at once. */
const MAX_REPLIES_PER_RUN = 3;

/** Below this, a message is chatter ("ok", "thanks!") and not worth classifying. */
const MIN_QUESTION_LENGTH = 12;

/** Following messages shown to the model when judging "has a human answered this?". */
const MAX_CONTEXT_MESSAGES = 25;

export async function runFaqSweep(env: Env): Promise<void> {
  const chatId = env.CHECKERS_CHAT_ID;

  const [params, faqs] = await Promise.all([
    getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
      "FAQ_GRACE_PERIOD_MINUTES",
      "FAQ_CONFIDENCE_THRESHOLD",
      "FAQ_MAX_AGE_HOURS",
    ]),
    loadFaqs(env.CHECKMATE_CHECKERS_PARAMETERS_KV),
  ]);

  if (faqs.length === 0) {
    console.error("FAQ sweep aborted: no FAQ entries loaded, nothing can be answered");
    return;
  }

  // Window is bounded by max age: anything older is past answering anyway, so
  // there is no reason to read it.
  const since = new Date(Date.now() - params.FAQ_MAX_AGE_HOURS * 60 * 60 * 1000);
  const result = await env.CHECKERS_DB_SERVICE.findChatMessagesSince(chatId, since.toISOString());

  if (!result.success || !result.data) {
    console.error(`FAQ sweep aborted: could not read chat messages: ${result.error}`);
    return;
  }

  // Everything in the window, including already-processed messages and replies —
  // a reply is how we know a human answered, whatever its own status.
  const window: CandidateMessage[] = result.data.map(doc => ({
    messageId: doc.messageId,
    userName: doc.telegramUsername || doc.name || "unknown",
    text: doc.text,
    date: Math.floor(new Date(doc.sentAt).getTime() / 1000),
    replyToMessageId: doc.replyToMessageId,
    messageThreadId: doc.messageThreadId,
  }));

  const processedIds = new Set(
    result.data.filter(doc => doc.faqProcessedAt !== null).map(doc => doc.messageId)
  );

  const candidates = selectCandidates(window, processedIds, {
    graceMinutes: params.FAQ_GRACE_PERIOD_MINUTES,
    maxAgeHours: params.FAQ_MAX_AGE_HOURS,
  });

  if (candidates.length === 0) return;

  if (candidates.length > MAX_CLASSIFICATIONS_PER_RUN) {
    console.warn(
      `${candidates.length} candidates but only classifying ${MAX_CLASSIFICATIONS_PER_RUN}; ` +
        `the rest wait for the next sweep`
    );
  }

  const shadowMode = env.FAQ_SHADOW_MODE === "true";
  const bot = shadowMode ? null : new Bot(env.TELEGRAM_ADMIN_BOT_TOKEN);

  // One reply per FAQ per run: if three people asked the same thing, the first
  // asker gets the answer and everyone reads it.
  const answeredFaqIds = new Set<string>();
  let repliesPosted = 0;

  for (const candidate of candidates.slice(0, MAX_CLASSIFICATIONS_PER_RUN)) {
    // Stage 1: is this worth answering at all? Cheap — no FAQ text in the prompt —
    // and most chatter that survives the non-LLM filters stops right here.
    const assessment = await assessQuestion(
      env,
      candidate.text,
      followingMessages(window, candidate)
    );

    if (!assessment) {
      // Model or gateway failure. Left unprocessed so the next sweep retries.
      continue;
    }

    if (!assessment.isQuestion) {
      await markProcessed(env, chatId, candidate.messageId, "not-a-question");
      continue;
    }

    if (assessment.alreadyAnswered) {
      console.log(`Message ${candidate.messageId} was already answered by a human`);
      await markProcessed(env, chatId, candidate.messageId, "human-answered");
      continue;
    }

    if (repliesPosted >= MAX_REPLIES_PER_RUN) {
      console.warn(
        `Reply cap (${MAX_REPLIES_PER_RUN}) reached; message ${candidate.messageId} ` +
          `deferred to the next sweep`
      );
      // Checked before stage 2, not after: the message is deferred either way,
      // so there is no reason to pay for the FAQ-laden call first.
      continue;
    }

    // Stage 2: only genuine unanswered questions reach the FAQ-laden prompt.
    const verdict = await matchFaq(env, candidate.text, faqs);

    if (!verdict) continue;

    if (verdict.faqId === "none" || !verdict.answer) {
      await markProcessed(env, chatId, candidate.messageId, "no-match");
      continue;
    }

    if (verdict.confidence < params.FAQ_CONFIDENCE_THRESHOLD) {
      console.log(
        `Below threshold (${verdict.confidence.toFixed(2)} < ${params.FAQ_CONFIDENCE_THRESHOLD}) ` +
          `for message ${candidate.messageId}, matched "${verdict.faqId}"`
      );
      await markProcessed(env, chatId, candidate.messageId, "low-confidence");
      continue;
    }

    if (answeredFaqIds.has(verdict.faqId)) {
      await markProcessed(env, chatId, candidate.messageId, "duplicate", verdict.faqId);
      continue;
    }

    // Claim the message before posting, not after. If the send throws after
    // Telegram already accepted it (a timeout, say), marking afterwards would
    // never run and the next sweep would post the same answer again. Posting
    // twice in a public volunteer chat is worse than missing once — and a miss
    // is loud in the logs below, where a duplicate would be silent.
    const claimed = await markProcessed(
      env,
      chatId,
      candidate.messageId,
      "answered",
      verdict.faqId
    );
    if (!claimed) {
      // Either the write failed or another sweep got there first. Posting now
      // would risk the duplicate the claim exists to prevent.
      console.warn(`Did not win the claim on ${candidate.messageId}; not posting`);
      continue;
    }
    answeredFaqIds.add(verdict.faqId);
    repliesPosted += 1;

    if (shadowMode) {
      console.log(
        `[shadow] would reply to ${candidate.messageId} (@${candidate.userName}) ` +
          `via "${verdict.faqId}" @ ${verdict.confidence.toFixed(2)}: ${verdict.answer}`
      );
      continue;
    }

    try {
      await bot!.api.sendMessage(chatId, verdict.answer, {
        // Plain text on purpose: model output is not trusted to be valid HTML,
        // and a parse failure would drop the message entirely.
        reply_parameters: { message_id: candidate.messageId },
        // Without this the reply lands in General regardless of where it was
        // asked. Undefined is correct for General itself.
        message_thread_id: candidate.messageThreadId ?? undefined,
      });
      console.log(
        `Replied to ${candidate.messageId} in topic ${candidate.messageThreadId ?? "General"} ` +
          `via "${verdict.faqId}" @ ${verdict.confidence.toFixed(2)}`
      );
    } catch (error) {
      console.error(
        `Failed to reply to ${candidate.messageId} (matched "${verdict.faqId}"); ` +
          `it will NOT be retried:`,
        error
      );
      // Correct the record: it was claimed as answered, but nothing was posted.
      // force, because this message is already claimed by this very sweep.
      await markProcessed(env, chatId, candidate.messageId, "send-failed", verdict.faqId, true);
      // Roll back the run-local counters, or a second person who asked the same
      // thing gets marked "duplicate" against an answer that was never posted.
      answeredFaqIds.delete(verdict.faqId);
      repliesPosted -= 1;
    }
  }
}

/**
 * Everything said after a question, in the same topic.
 *
 * This is what lets the model judge whether a human already answered. People
 * mostly answer by just typing the next message rather than using Telegram's
 * reply feature, so threading metadata alone would miss most real answers and
 * the bot would talk over colleagues who had already helped.
 */
export function followingMessages(
  window: CandidateMessage[],
  candidate: CandidateMessage
): FollowingMessage[] {
  return window
    .filter(
      message =>
        message.messageThreadId === candidate.messageThreadId &&
        message.date >= candidate.date &&
        message.messageId !== candidate.messageId
    )
    .sort((a, b) => a.date - b.date)
    .slice(0, MAX_CONTEXT_MESSAGES)
    .map(message => ({
      userName: message.userName,
      // Long messages are truncated: enough to tell whether it answers the
      // question, without letting one essay dominate the prompt.
      text: message.text.length > 400 ? `${message.text.slice(0, 400)}…` : message.text,
    }));
}

/**
 * Claim a message, returning whether this sweep won it.
 *
 * The write is conditional on the message still being unprocessed, so if two
 * sweeps overlap only one can claim it. Callers about to post MUST check the
 * return value — a lost claim means someone else is handling this message.
 */
async function markProcessed(
  env: Env,
  chatId: string,
  messageId: number,
  outcome:
    | "answered"
    | "human-answered"
    | "not-a-question"
    | "no-match"
    | "low-confidence"
    | "duplicate"
    | "send-failed",
  faqId: string | null = null,
  force = false
): Promise<boolean> {
  const result = await env.CHECKERS_DB_SERVICE.markChatMessageProcessed(
    chatId,
    messageId,
    outcome,
    faqId,
    force
  );
  if (!result.success) {
    console.error(`Failed to mark message ${messageId} as ${outcome}: ${result.error}`);
    return false;
  }
  return result.claimed !== false;
}

/**
 * Questions that are ripe to answer: old enough that humans have had their
 * chance, young enough to still be useful, and not already dealt with.
 */
export function selectCandidates(
  messages: CandidateMessage[],
  processedIds: Set<number>,
  opts: { graceMinutes: number; maxAgeHours: number }
): CandidateMessage[] {
  const nowSeconds = Date.now() / 1000;
  const graceSeconds = opts.graceMinutes * 60;
  const maxAgeSeconds = opts.maxAgeHours * 60 * 60;

  // A threaded reply is unambiguous, so it skips the message without a model
  // call. It is only a fast path, not the real test: most people answer by
  // typing the next message rather than using the reply feature, and those are
  // caught later by the model (see followingMessages).
  const answeredByHuman = new Set(
    messages.map(message => message.replyToMessageId).filter((id): id is number => id !== null)
  );

  return (
    messages
      .filter(message => {
        if (processedIds.has(message.messageId)) return false;
        if (answeredByHuman.has(message.messageId)) return false;

        // Commands and chatter are recorded for analysis but never answered.
        if (message.text.startsWith("/")) return false;
        if (message.text.length < MIN_QUESTION_LENGTH) return false;

        const age = nowSeconds - message.date;
        if (age < graceSeconds) return false;
        if (age > maxAgeSeconds) return false;

        return true;
      })
      // Oldest first. Load-bearing, not cosmetic: the caller answers at most one
      // message per FAQ per run, so this is what makes the earliest asker the one
      // who gets the reply.
      .sort((a, b) => a.date - b.date)
  );
}
