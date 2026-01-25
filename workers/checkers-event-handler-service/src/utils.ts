import { Bot, InlineKeyboard } from "grammy";

import { DAYS_MS } from "./constants";
import type { CheckerAPI, VoteAPI } from "./types";

/**
 * Get the reference date for inactivity calculation.
 * Uses the most recent of: lastVotedTimestamp, onboardingTime, lastActivatedDate
 */
export function getLastActiveDate(checker: CheckerAPI): Date | null {
  const dates = [checker.lastVotedTimestamp, checker.onboardingTime, checker.lastActivatedDate]
    .filter((d): d is Date => d !== null)
    .map(d => new Date(d));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Calculate days since a given date
 */
export function daysSince(date: Date): number {
  return (Date.now() - new Date(date).getTime()) / DAYS_MS;
}

/**
 * Update the Telegram notification button text after a vote is submitted
 * Changes "Vote 🗳️!" to "Edit/View Vote 👀!"
 */
export async function updateVoteButtonText(env: Env, vote: VoteAPI): Promise<void> {
  // Skip if no message ID stored
  if (!vote.telegramMessageId) {
    console.log(`No telegramMessageId for vote ${vote._id}, skipping button update`);
    return;
  }

  try {
    // Get the checker's telegramId
    const checkerResult = await env.CHECKERS_DB_SERVICE.findCheckers({ _id: vote.checkerId });
    if (!checkerResult.success || !checkerResult.data?.[0]) {
      console.error(`Checker not found for vote ${vote._id}`);
      return;
    }

    const checker = checkerResult.data[0];
    const voteUrl = `${env.HOST_URL}/votes/${vote._id}`;

    // Create bot and update the button
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const keyboard = new InlineKeyboard().webApp("Edit/View Vote 👀!", voteUrl);

    await bot.api.editMessageReplyMarkup(checker.telegramId, vote.telegramMessageId, {
      reply_markup: keyboard,
    });

    console.log(`Updated button text for vote ${vote._id}`);
  } catch (error) {
    // Don't fail the whole handler if button update fails
    console.error(`Failed to update button text for vote ${vote._id}:`, error);
  }
}
