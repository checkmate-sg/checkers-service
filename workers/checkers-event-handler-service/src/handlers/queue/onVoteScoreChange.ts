import { Bot } from "grammy";

import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";

import { MESSAGES } from "../../constants";
import type { VoteScoreChangedData } from "../../types";

/**
 * Handle vote.scoreChanged events
 * Triggered when a vote's isCorrect value changes (from scoring)
 *
 * Performs:
 * 1. Accuracy nudge check - send warning if accuracy drops below threshold
 * 2. Graduation check - emit programme.completed if all targets met
 */
export async function handleVoteScoreChange(env: Env, data: VoteScoreChangedData): Promise<void> {
  const { checkerId } = data;
  console.log(`Processing vote.scoreChanged for checker ${checkerId}`);

  // Fetch checker and their active programme
  const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });
  if (!checkerResult.success || !checkerResult.data) {
    console.error(`Checker not found: ${checkerId}`);
    return;
  }

  const checker = checkerResult.data;

  // No active programme - nothing to check
  if (!checker.currentProgrammeId) {
    return;
  }

  // Fetch checker's current programme
  const programmeResult = await env.CHECKERS_DB_SERVICE.findOneProgramme({
    _id: checker.currentProgrammeId,
  });

  if (!programmeResult.success || !programmeResult.data) {
    console.error(`Programme not found: ${checker.currentProgrammeId}`);
    return;
  }

  const programme = programmeResult.data;

  // Calculate checker's programme progress
  const progressResult = await calculateProgrammeProgress(env, checkerId, {
    startDate: programme.startDate,
    votesAtStart: programme.votesAtStart,
  });

  if (!progressResult.success || !progressResult.data) {
    console.error(`Failed to calculate progress: ${progressResult.error}`);
    return;
  }

  const progress = progressResult.data;

  // 1. Check accuracy nudge conditions
  await checkAccuracyNudge(env, checker, programme, progress);

  // 2. Check graduation conditions
  await checkGraduation(env, checker, programme, progress);
}

/**
 * Check if accuracy nudge should be sent
 * Conditions:
 * - Votes cast >= env.ACCURACY_NUDGE_VOTE_THRESHOLD
 * - Accuracy < env.ACCURACY_NUDGE_THRESHOLD
 * - hasReceivedLowAccuracyWarning === false
 */
async function checkAccuracyNudge(
  env: Env,
  checker: { _id: string; name: string | null; telegramId: string },
  programme: { _id: string; hasReceivedLowAccuracyWarning: boolean },
  progress: { voteCount: number; accuracy: number | null }
): Promise<void> {
  const voteThreshold = parseInt(env.ACCURACY_NUDGE_VOTE_THRESHOLD) || 20;
  const accuracyThreshold = parseInt(env.ACCURACY_NUDGE_THRESHOLD) || 50;

  // Already received warning - skip
  if (programme.hasReceivedLowAccuracyWarning) {
    return;
  }

  // Not enough votes yet
  if (progress.voteCount < voteThreshold) {
    return;
  }

  // Accuracy is above threshold (or null)
  if (progress.accuracy === null || progress.accuracy >= accuracyThreshold) {
    return;
  }

  // Calculate incorrect percentage for the message
  const incorrectPercentage = 100 - progress.accuracy;

  console.log(
    `Sending accuracy nudge to checker ${checker._id} (accuracy: ${progress.accuracy}%, votes: ${progress.voteCount})`
  );

  // Send Telegram message
  try {
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const message = MESSAGES.accuracyNudge({
      name: checker.name || "Checker",
      numMessages: progress.voteCount,
      accuracyThreshold: Math.round(incorrectPercentage),
      groupLink: env.CHECKERS_GROUP_LINK,
    });

    await bot.api.sendMessage(checker.telegramId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Review Resources",
              callback_data: "RESOURCES",
            },
          ],
        ],
      },
    });

    console.log(`Sent accuracy nudge to checker ${checker._id}`);
  } catch (err) {
    console.error(`Failed to send accuracy nudge: ${err}`);
  }

  // Update programme to mark nudge as sent
  await env.CHECKERS_DB_SERVICE.updateOneProgramme(
    { _id: programme._id },
    { $set: { hasReceivedLowAccuracyWarning: true } }
  );
}

/**
 * Check if checker has met all programme targets and should graduate
 * If graduated, emits a "programme.completed" event for async processing
 */
async function checkGraduation(
  env: Env,
  checker: { _id: string; currentProgrammeId: string | null },
  programme: { _id: string; targets: { votes: number; accuracy: number; reports: number } },
  progress: { voteCount: number; accuracy: number | null; reportCount: number }
): Promise<void> {
  console.log("Checking graduation conditions");
  // Check vote count threshold
  if (progress.voteCount < programme.targets.votes) {
    return;
  }

  // Check accuracy threshold
  if ((progress.accuracy ?? 0) < programme.targets.accuracy) {
    return;
  }

  // Check reports threshold
  if (progress.reportCount < programme.targets.reports) {
    return;
  }

  // All targets met - emit graduation event for async processing
  await env.CHECKERS_EVENTS_QUEUE.send({
    type: "programme.completed",
    data: {
      checkerId: checker._id,
      programmeId: programme._id,
      stats: {
        voteCount: progress.voteCount,
        accuracy: progress.accuracy ?? 0,
        reportCount: progress.reportCount,
      },
    },
    timestamp: new Date().toISOString(),
  });

  console.log(`Emitted programme.completed event for checker ${checker._id}`);
}
