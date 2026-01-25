import { Bot } from "grammy";

import { getParameters } from "@/shared/helpers/parameters";
import { MESSAGES } from "../../constants";
import type { HandlerResult } from "../../types";
import { daysSince, getLastActiveDate } from "../../utils";

/**
 * Check if a checker has overdue pending votes
 *
 * A checker is considered to have overdue votes if:
 * - They have at least one pending vote (votedTimestamp === null)
 * - At least one pending vote is older than the threshold (overdue)
 */
async function hasOverduePendingVotes(
  env: Env,
  checkerId: string,
  thresholdDays: number
): Promise<boolean> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  // Find pending votes for this checker that are older than threshold
  const result = await env.CHECKERS_DB_SERVICE.findVotes({
    checkerId,
    votedTimestamp: null, // Pending (not yet voted)
    createdTimestamp: { $lt: thresholdDate }, // Older than threshold (overdue)
  });

  return result.success && result.data && result.data.length > 0;
}

/**
 * Process 3-day inactivity warnings
 *
 * A checker receives a warning if ALL conditions are met:
 * 1. Has pending vote requests with at least one overdue (older than threshold)
 * 2. Last vote was more than threshold days ago (or never voted)
 * 3. Onboarded more than threshold days ago
 * 4. Last reactivation was more than threshold days ago (or never reactivated)
 */
async function processInactivityWarnings(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  // Get parameters from KV
  const params = await getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
    "INACTIVITY_WARNING_DAYS",
    "INACTIVITY_DEACTIVATION_DAYS",
  ]);

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

      // Check if inactive for threshold days but less than deactivation threshold
      if (
        daysSinceActive >= params.INACTIVITY_WARNING_DAYS &&
        daysSinceActive < params.INACTIVITY_DEACTIVATION_DAYS
      ) {
        // Check if we already sent a warning recently (within last 7 days)
        if (
          checker.lastInactivityWarningSent &&
          daysSince(new Date(checker.lastInactivityWarningSent)) < 7
        ) {
          continue;
        }

        // Check if checker has overdue pending votes
        const hasOverdue = await hasOverduePendingVotes(
          env,
          checker._id,
          params.INACTIVITY_WARNING_DAYS
        );

        if (!hasOverdue) {
          // No overdue pending votes - skip warning
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
 *
 * A checker is deactivated if ALL conditions are met:
 * 1. Has pending vote requests with at least one overdue (older than threshold)
 * 2. Last vote was more than threshold days ago (or never voted)
 * 3. Onboarded more than threshold days ago
 * 4. Last reactivation was more than threshold days ago (or never reactivated)
 */
async function processDeactivations(env: Env, bot: Bot): Promise<HandlerResult> {
  const errors: string[] = [];
  let processed = 0;

  // Get parameters from KV
  const { INACTIVITY_DEACTIVATION_DAYS } = await getParameters(
    env.CHECKMATE_CHECKERS_PARAMETERS_KV,
    ["INACTIVITY_DEACTIVATION_DAYS"]
  );

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

      // Check if inactive for deactivation threshold days
      if (daysSinceActive >= INACTIVITY_DEACTIVATION_DAYS) {
        // Check if checker has overdue pending votes
        const hasOverdue = await hasOverduePendingVotes(
          env,
          checker._id,
          INACTIVITY_DEACTIVATION_DAYS
        );

        if (!hasOverdue) {
          // No overdue pending votes - skip deactivation
          continue;
        }

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
