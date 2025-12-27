import { Bot } from "grammy";

import { DAYS_MS, MESSAGES, PROGRAMME_EXTENSION_DAYS, PROGRAMME_OFFBOARDING_DAYS } from "../../constants";
import type { HandlerResult } from "../../types";

/**
 * Process 60-day programme extension notices
 */
async function processProgrammeExtensions(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_EXTENSION_DAYS * DAYS_MS);

  // Find checkers who onboarded > 60 days ago and haven't completed/received extension
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isOnboardingComplete: true,
    hasCompletedProgramme: false,
    hasReceivedExtension: false,
    onboardingTime: { $lt: thresholdDate },
    onboardingStatus: { $ne: "offboarded" },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      // Send extension notice
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.programmeExtension(checker.name || "Checker", env.QUIZ_LINK),
        { parse_mode: "HTML" }
      );

      // Mark as received extension
      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { _id: checker._id },
        { $set: { hasReceivedExtension: true } }
      );

      processed++;
      console.log(`Sent programme extension notice to checker ${checker._id}`);
    } catch (err) {
      const errorMsg = `Failed to process extension for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 90-day programme offboarding
 */
async function processProgrammeOffboarding(
  env: Env,
  bot: Bot,
  adminBot: Bot
): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_OFFBOARDING_DAYS * DAYS_MS);

  // Find checkers who onboarded > 90 days ago, haven't completed programme,
  // and have already received their extension notice
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isOnboardingComplete: true,
    hasCompletedProgramme: false,
    hasReceivedExtension: true,
    onboardingTime: { $lt: thresholdDate },
    onboardingStatus: { $ne: "offboarded" },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      // Send offboarding message
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.programmeOffboarding(checker.name || "Checker", env.OFFBOARDED_SURVEY_LINK),
        { parse_mode: "HTML" }
      );

      // Remove from Telegram group
      try {
        // Immediately unban to allow future rejoining if needed
        await adminBot.api.unbanChatMember(env.CHECKERS_CHAT_ID, Number(checker.telegramId));
      } catch (groupErr) {
        console.error(`Failed to remove checker ${checker._id} from group: ${groupErr}`);
        // Continue with offboarding even if group removal fails
      }

      // Update checker record
      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { _id: checker._id },
        {
          $set: {
            isActive: false,
            offboardingTime: new Date(),
            onboardingStatus: "offboarded",
          },
        }
      );

      processed++;
      console.log(`Offboarded checker ${checker._id}`);
    } catch (err) {
      const errorMsg = `Failed to process offboarding for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Run all programme checks (extensions + offboarding)
 */
export async function runProgrammeChecks(env: Env, bot: Bot, adminBot: Bot): Promise<void> {
  console.log("Running programme checks...");

  const extensionResult = await processProgrammeExtensions(env, bot);
  console.log(
    `Programme extensions: ${extensionResult.processed} processed, ${extensionResult.errors.length} errors`
  );

  const offboardingResult = await processProgrammeOffboarding(env, bot, adminBot);
  console.log(
    `Programme offboarding: ${offboardingResult.processed} processed, ${offboardingResult.errors.length} errors`
  );
}
