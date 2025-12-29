import { Bot } from "grammy";

import { DAYS_MS, MESSAGES, PROGRAMME_EXTENSION_DAYS, PROGRAMME_OFFBOARDING_DAYS } from "../../constants";
import type { HandlerResult } from "../../types";

/**
 * Process 60-day programme extension notices
 * Queries Programme collection for active programmes past 60 days
 */
async function processProgrammeExtensions(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_EXTENSION_DAYS * DAYS_MS);

  // Find programmes that are active, haven't received extension, and started > 60 days ago
  const result = await env.CHECKERS_DB_SERVICE.findProgrammes({
    status: "active",
    hasReceivedExtension: false,
    startDate: { $lt: thresholdDate },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch programmes"] };
  }

  for (const programme of result.data) {
    try {
      // Fetch the checker details
      const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({
        _id: programme.checkerId,
      });

      if (!checkerResult.success || !checkerResult.data) {
        errors.push(`Checker not found for programme ${programme._id}`);
        continue;
      }

      const checker = checkerResult.data;

      // Send extension notice
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.programmeExtension(checker.name || "Checker", env.QUIZ_LINK),
        { parse_mode: "HTML" }
      );

      // Update programme: mark as extended
      await env.CHECKERS_DB_SERVICE.updateOneProgramme(
        { _id: programme._id },
        { $set: { status: "extended", hasReceivedExtension: true } }
      );

      processed++;
      console.log(`Sent programme extension notice to checker ${checker._id} (programme ${programme._id})`);
    } catch (err) {
      const errorMsg = `Failed to process extension for programme ${programme._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 90-day programme offboarding
 * Queries Programme collection for extended programmes past 90 days
 */
async function processProgrammeOffboarding(
  env: Env,
  bot: Bot,
  adminBot: Bot
): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_OFFBOARDING_DAYS * DAYS_MS);

  // Find programmes that are extended (received extension) and started > 90 days ago
  const result = await env.CHECKERS_DB_SERVICE.findProgrammes({
    status: "extended",
    startDate: { $lt: thresholdDate },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch programmes"] };
  }

  for (const programme of result.data) {
    try {
      // Fetch the checker details
      const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({
        _id: programme.checkerId,
      });

      if (!checkerResult.success || !checkerResult.data) {
        errors.push(`Checker not found for programme ${programme._id}`);
        continue;
      }

      const checker = checkerResult.data;

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

      // Update programme record
      await env.CHECKERS_DB_SERVICE.updateOneProgramme(
        { _id: programme._id },
        {
          $set: {
            status: "offboarded",
            endDate: new Date(),
          },
        }
      );

      // Update checker record
      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { _id: checker._id },
        {
          $set: {
            isActive: false,
            offboardingTime: new Date(),
            onboardingStatus: "offboarded",
            currentProgrammeId: null,
          },
        }
      );

      processed++;
      console.log(`Offboarded checker ${checker._id} (programme ${programme._id})`);
    } catch (err) {
      const errorMsg = `Failed to process offboarding for programme ${programme._id}: ${err}`;
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
