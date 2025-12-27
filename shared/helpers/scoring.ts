/**
 * Scoring helpers for vote assessment
 * Used by both NextJS API routes and Cloudflare Workers
 */

/**
 * Compute gamification score based on response time and correctness
 * Faster correct votes earn more points (Kahoot-style)
 *
 * Score range: 0.5-1.0 for correct votes, 0 for incorrect
 */
export function computeGamificationScore(
  createdTimestamp: Date,
  votedTimestamp: Date,
  isCorrect: boolean | null
): number {
  const timeBucketSize = 300; // 5 minutes in seconds
  const maxTimeAllowedForPoints = 24 * 60 * 60; // 24 hours in seconds

  const timeTaken = (votedTimestamp.getTime() - createdTimestamp.getTime()) / 1000;
  const numBuckets = Math.ceil(maxTimeAllowedForPoints / timeBucketSize);
  const timeBucket = Math.min(Math.floor(timeTaken / timeBucketSize), numBuckets);

  const points = isCorrect === true ? 1 - timeBucket / numBuckets / 2 : 0;
  return points;
}

/**
 * Check if a vote matches the crowd-sourced consensus
 * Returns null for ambiguous cases (no penalty/reward)
 */
export function checkAccuracy(
  voteCategory: string | null,
  voteTruthScore: number | null,
  crowdSourcedCategory: string | null,
  crowdSourcedTruthScore: number | null
): boolean | null {
  if (!crowdSourcedCategory) {
    return null;
  }
  if (crowdSourcedCategory === "unsure") {
    return null;
  }
  if (voteCategory === "pass" || voteCategory === null) {
    return null;
  }
  if (voteCategory === "info") {
    if (!["misleading", "untrue", "accurate"].includes(crowdSourcedCategory)) {
      return false;
    }
    if (crowdSourcedTruthScore === null || voteTruthScore === null) {
      return null;
    }
    return Math.abs(crowdSourcedTruthScore - voteTruthScore) <= 1;
  }
  return crowdSourcedCategory === voteCategory;
}
