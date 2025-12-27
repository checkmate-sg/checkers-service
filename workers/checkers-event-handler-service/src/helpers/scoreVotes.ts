import { checkAccuracy, computeGamificationScore } from "@/shared/helpers/scoring";

import type { VoteAPI } from "../types";

/**
 * Score all submitted votes for a poll
 * Used by both assessment.complete and primaryCategory.changed handlers
 */
export async function scoreAllVotesForPoll(
  env: Env,
  pollId: string,
  primaryCategory: string,
  truthScore: number | null
): Promise<void> {
  const votesResult = await env.CHECKERS_DB_SERVICE.findVotes({
    pollId,
    votedTimestamp: { $ne: null },
  });

  if (!votesResult.success || !votesResult.data) {
    console.error(`Failed to fetch votes for poll ${pollId}`);
    return;
  }

  const votes = votesResult.data;
  console.log(`Scoring ${votes.length} votes for poll ${pollId}`);

  for (const vote of votes) {
    await scoreVote(env, vote, primaryCategory, truthScore);
  }
}

async function scoreVote(
  env: Env,
  vote: VoteAPI,
  primaryCategory: string,
  truthScore: number | null
): Promise<void> {
  if (!vote.votedTimestamp || !vote.createdTimestamp) {
    return;
  }

  const isCorrect = checkAccuracy(vote.category, vote.truthScore, primaryCategory, truthScore);
  const score = computeGamificationScore(
    new Date(vote.createdTimestamp),
    new Date(vote.votedTimestamp),
    isCorrect
  );

  await env.CHECKERS_DB_SERVICE.updateOneVote(
    { _id: vote._id },
    { $set: { isCorrect, score } }
  );
}
