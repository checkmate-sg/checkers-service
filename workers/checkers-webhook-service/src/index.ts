import { Hono } from "hono";
import { webhookCallback } from "grammy";
import { createBot } from "./bot";
import { handleTypeformWebhook } from "./typeform";
import { handlePollWebhook } from "./polls";

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

export default app;
