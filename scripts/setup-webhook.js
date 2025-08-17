import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

async function setupWebhook() {
  try {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("TELEGRAM_WEBHOOK_URL not found in environment variables");
      process.exit(1);
    }

    console.log("Setting webhook to:", webhookUrl);

    const result = await bot.api.setWebhook(webhookUrl, {
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    });
    console.log("Webhook setup result:", result);

    // Get webhook info to verify
    const info = await bot.api.getWebhookInfo();
    console.log("Current webhook info:", info);

    console.log("✅ Webhook setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up webhook:", error);
  }
}

setupWebhook();