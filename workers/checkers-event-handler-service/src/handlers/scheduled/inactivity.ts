import { Bot } from "grammy";

import { INACTIVITY_DEACTIVATION_DAYS, INACTIVITY_WARNING_DAYS, MESSAGES } from "../../constants";
import type { HandlerResult } from "../../types";
import { daysSince, getLastActiveDate } from "../../utils";

/**
 * Process 3-day inactivity warnings
 */
async function processInactivityWarnings(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  // Find active checkers who might need a warning
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isActive: true,
    isOnboardingComplete: true,
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      const lastActive = getLastActiveDate(checker);
      if (!lastActive) continue;

      const daysSinceActive = daysSince(lastActive);

      // Check if inactive for 3+ days but less than 10 days
      if (
        daysSinceActive >= INACTIVITY_WARNING_DAYS &&
        daysSinceActive < INACTIVITY_DEACTIVATION_DAYS
      ) {
        // Check if we already sent a warning recently (within last 7 days)
        if (
          checker.lastInactivityWarningSent &&
          daysSince(new Date(checker.lastInactivityWarningSent)) < 7
        ) {
          continue;
        }

        // Send warning message
        await bot.api.sendMessage(
          checker.telegramId,
          MESSAGES.inactivityWarning(checker.name || "Checker", env.CHECKERS_GROUP_LINK),
          { parse_mode: "HTML" }
        );

        // Update lastInactivityWarningSent
        await env.CHECKERS_DB_SERVICE.updateOneChecker(
          { _id: checker._id },
          { $set: { lastInactivityWarningSent: new Date() } }
        );

        processed++;
        console.log(`Sent inactivity warning to checker ${checker._id}`);
      }
    } catch (err) {
      const errorMsg = `Failed to process warning for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 10-day deactivations
 */
async function processDeactivations(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  // Find active checkers
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isActive: true,
    isOnboardingComplete: true,
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      const lastActive = getLastActiveDate(checker);
      if (!lastActive) continue;

      const daysSinceActive = daysSince(lastActive);

      // Check if inactive for 10+ days
      if (daysSinceActive >= INACTIVITY_DEACTIVATION_DAYS) {
        // Send deactivation message with reactivate button
        await bot.api.sendMessage(
          checker.telegramId,
          MESSAGES.deactivationNotice(checker.name || "Checker"),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "Reactivate Now 🚀", callback_data: "reactivate" }]],
            },
          }
        );

        // Deactivate the checker
        await env.CHECKERS_DB_SERVICE.updateOneChecker(
          { _id: checker._id },
          { $set: { isActive: false } }
        );

        // Schedule reactivation reminders via alarm service
        await env.CHECKER_REMINDER_ALARM_SERVICE.scheduleReactivationReminders(
          checker._id,
          checker.telegramId,
          checker.name || "Checker"
        );

        processed++;
        console.log(`Deactivated checker ${checker._id} and scheduled reminders`);
      }
    } catch (err) {
      const errorMsg = `Failed to process deactivation for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Run all inactivity checks (warnings + deactivations)
 */
export async function runInactivityChecks(env: Env, bot: Bot): Promise<void> {
  console.log("Running inactivity checks...");

  const warningResult = await processInactivityWarnings(env, bot);
  console.log(
    `Inactivity warnings: ${warningResult.processed} processed, ${warningResult.errors.length} errors`
  );

  const deactivationResult = await processDeactivations(env, bot);
  console.log(
    `Deactivations: ${deactivationResult.processed} processed, ${deactivationResult.errors.length} errors`
  );
}
