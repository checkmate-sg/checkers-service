import { WorkerEntrypoint } from "cloudflare:workers";
import { Hono } from "hono";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { handleTypeformWebhook } from "./typeform";
import { handlePollWebhook } from "./polls";
import { handleCheckerStatsWebhook } from "./checker-stats";

const app = new Hono<{ Bindings: Env }>();

// Health check endpoint
app.get("/", c => {
  return c.json({ status: "healthy", service: "checkers-webhook-service" });
});

// Telegram webhook endpoint
app.post("/telegram", async c => {
  const env = c.env;

  // Create bot instance with env available via closure
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, env);

  // Handle the webhook using grammY's webhookCallback (handles secret verification)
  const handleUpdate = webhookCallback(bot, "hono", {
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
  });

  try {
    return await handleUpdate(c);
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});
// Typeform webhook endpoint for quiz completion
app.post("/typeform", handleTypeformWebhook);

// Poll webhook endpoint for receiving checks from CheckMate
app.post("/polls/webhook", handlePollWebhook);

// Checker stats endpoint for ops automation (batch)
app.post("/checker-stats", handleCheckerStatsWebhook);

export default class extends WorkerEntrypoint<Env> {
  async fetch(request: Request) {
    return app.fetch(request, this.env, this.ctx);
  }

  async getOnboardingStatus(whatsappId: string): Promise<string | null> {
    const result = await this.env.CHECKERS_DB_SERVICE.findOneChecker({
      whatsappId,
    });

    if (!result.success || !result.data) {
      return null;
    }

    return result.data.onboardingStatus;
  }
}
