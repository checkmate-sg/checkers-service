import { Bot } from "grammy";

import { checkGraduation } from "@/shared/helpers/checkGraduation";
import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";
import { getParameters } from "@/shared/helpers/parameters";

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

  // 2. Check graduation conditions (re-fetches; cheap and keeps single source of truth)
  await checkGraduation(env, checkerId);
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
  // Get parameters from KV
  const params = await getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
    "ACCURACY_NUDGE_VOTE_THRESHOLD",
    "ACCURACY_NUDGE_THRESHOLD",
  ]);
  const voteThreshold = params.ACCURACY_NUDGE_VOTE_THRESHOLD;
  const accuracyThreshold = params.ACCURACY_NUDGE_THRESHOLD;

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
