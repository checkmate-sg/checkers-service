import { Bot, InlineKeyboard } from "grammy";

import { MESSAGES } from "../../constants";
import type { HandlerResult } from "../../types";

/**
 * Send a weekly welcome message to all active, onboarded checkers
 * to encourage them to check the portal for new messages to vote on.
 */
export async function runWeeklyWelcomeMessage(env: Env, bot: Bot): Promise<void> {
  console.log("Running weekly welcome message...");

  const result = await sendWelcomeMessages(env, bot);
  console.log(
    `Weekly welcome messages: ${result.processed} processed, ${result.errors.length} errors`
  );
}

async function sendWelcomeMessages(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isActive: true,
    isOnboardingComplete: true,
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  const keyboard = new InlineKeyboard().webApp("🚀 Open Checker's Portal", env.HOST_URL);

  for (const checker of result.data) {
    try {
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.weeklyWelcome(checker.name || "Checker"),
        {
          parse_mode: "HTML",
          reply_markup: keyboard,
        }
      );

      processed++;
      console.log(`Sent weekly welcome message to checker ${checker._id}`);
    } catch (err) {
      const errorMsg = `Failed to send welcome message to checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}
