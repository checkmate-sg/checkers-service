import { Bot } from "grammy";

import { MESSAGES } from "../../constants";

/**
 * Send a weekly welcome message to the group chat listing
 * checkers who onboarded in the past week.
 */
export async function runWeeklyWelcomeMessage(env: Env, adminBot: Bot): Promise<void> {
  console.log("Running weekly welcome message...");

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  lastWeek.setUTCHours(4, 3, 0, 0); // 12:03 PM SGT = 4:03 AM UTC

  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    onboardingTime: { $gte: lastWeek },
  });

  if (!result.success || !result.data || result.data.length === 0) {
    console.log("No new checkers onboarded in the past week");
    return;
  }

  const names = result.data
    .map(checker => {
      const username = checker.telegramUsername ? `@${checker.telegramUsername}` : null;
      const name = (checker.name || "New Checker")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return username || name;
    })
    .join("\n");

  const message = MESSAGES.weeklyWelcome(names);

  try {
    await adminBot.api.sendMessage(env.CHECKERS_CHAT_ID, message, {
      parse_mode: "HTML",
    });
    console.log(`Sent weekly welcome message for ${result.data.length} new checkers`);
  } catch (err) {
    console.error(`Failed to send weekly welcome message: ${err}`);
  }
}
