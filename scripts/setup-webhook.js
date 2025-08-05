import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function setupWebhook() {
  try {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("TELEGRAM_WEBHOOK_URL not found in environment variables");
      process.exit(1);
    }

    console.log("Setting webhook to:", webhookUrl);

    const result = await bot.setWebHook(webhookUrl);
    console.log("Webhook setup result:", result);

    // Get webhook info to verify
    const info = await bot.getWebHookInfo();
    console.log("Current webhook info:", info);

    console.log("✅ Webhook setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up webhook:", error);
  }
}

setupWebhook();
