export function computeGamificationScore(
  createdTimestamp: Date,
  votedTimestamp: Date,
  isCorrect: boolean | null
) {
  // Scoring parameters
  const timeBucketSize = 300; // 5 minutes
  const maxTimeAllowedForPoints = 24 * 60 * 60; // 24 hours

  // Calculate the time taken to vote in seconds
  const timeTaken = (votedTimestamp.getTime() - createdTimestamp.getTime()) / 1000;
  const numBuckets = Math.ceil(maxTimeAllowedForPoints / timeBucketSize);
  const timeBucket = Math.min(Math.floor(timeTaken / timeBucketSize), numBuckets);

  // Scoring function
  const points = isCorrect === true ? 1 - timeBucket / numBuckets / 2 : 0;
  return points;
}

export function checkAccuracy(
  voteCategory: string | null,
  voteTruthScore: number | null,
  crowdSourcedCategory: string | null,
  crowdSourcedTruthScore: number | null
) {
  if (!crowdSourcedCategory) {
    return null;
  }
  if (crowdSourcedCategory === "unsure") {
    // Don't penalise if final outcome is unsure
    return null;
  }
  if (crowdSourcedCategory === null) {
    console.warn("Parent message has no category");
    return null;
  }
  if (voteCategory === "pass") {
    console.log("Checker has passed");
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
  } else {
    return crowdSourcedCategory === voteCategory;
  }
}
