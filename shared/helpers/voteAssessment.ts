/**
 * Vote assessment logic for determining poll consensus
 * Used by both NextJS API routes and Cloudflare Workers
 */

const ALL_CATEGORIES = [
  "scam",
  "info",
  "satire",
  "spam",
  "legitimate",
  "irrelevant",
  "unsure",
  "pass",
  null,
];
const ALL_RESPONSE_CATEGORIES = ["great", "acceptable", "unacceptable", null];

export interface VoteAssessmentResult {
  primaryCategory: string;
  truthScore: number | null;
  isDownvoted: boolean;
}

export interface DBService {
  getVotesDetails(
    pollId: string,
    aggregationPipeline: unknown[]
  ): Promise<{ success: boolean; data?: unknown[]; error?: string }>;
}

/**
 * Assess votes for a poll and determine if consensus has been reached
 * Returns null if not yet assessed, or the assessment result if complete
 */
export async function voteAssessment(
  dbService: DBService,
  pollId: string
): Promise<{ success: boolean; data?: VoteAssessmentResult | null; error?: string }> {
  try {
    // Get category counts
    const categoryCounts = await getCategoryCountsByPollId(dbService, pollId);
    if ("error" in categoryCounts) {
      return { success: false, error: categoryCounts.error as string };
    }

    // Get total vote requests count
    const totalVoteRequestsCount = await getTotalVoteRequestsCount(dbService, pollId);
    if (typeof totalVoteRequestsCount !== "number") {
      return { success: false, error: "Failed to get total vote requests count" };
    }

    // factCheckerCount = all checkers who could vote (excludes only those who passed)
    const factCheckerCount = totalVoteRequestsCount - categoryCounts["pass"];

    // validResponseCount = checkers who actually voted (excludes pass AND null/not-voted-yet)
    const validResponseCount =
      totalVoteRequestsCount - categoryCounts["pass"] - categoryCounts["null"];

    const susCount = categoryCounts["scam"];

    // noClaimCount = irrelevantCount + legitimateCount
    const noClaimCount = categoryCounts["irrelevant"] + categoryCounts["legitimate"];

    // Compute totalTruthScoreValue and truthScore
    const totalTruthScoreValue = await getTotalTruthScoreValue(dbService, pollId);
    const truthScore = computeTruthScore(categoryCounts["info"], totalTruthScoreValue);

    let harmfulCount = categoryCounts["scam"];

    // harmlessCount = legitimateCount + spamCount
    let harmlessCount = categoryCounts["legitimate"] + categoryCounts["spam"];

    if (truthScore !== null) {
      if (truthScore < 1.5) {
        harmfulCount += categoryCounts["info"];
      } else if (truthScore > 3.75) {
        harmlessCount += categoryCounts["info"];
      }
    }

    const isHarmless = harmlessCount > 0.5 * validResponseCount;
    const isHarmful = harmfulCount > 0.5 * validResponseCount;

    const isBigSus = susCount > 0.75 * validResponseCount;
    const isSus = isBigSus || susCount > 0.5 * validResponseCount;
    const isScam = isSus; // scam and illicit merged - susCount includes both
    const isInfo = categoryCounts["info"] > 0.5 * validResponseCount;
    const isSatire = categoryCounts["satire"] > 0.5 * validResponseCount;
    const isSpam = categoryCounts["spam"] > 0.5 * validResponseCount;
    const isNoClaim = noClaimCount > 0.5 * validResponseCount;
    const isLegitimate = isNoClaim && categoryCounts["legitimate"] > categoryCounts["irrelevant"];
    const isIrrelevant = isNoClaim && !isLegitimate;
    const isUnsure =
      (!isSus && !isBigSus && !isInfo && !isSpam && !isLegitimate && !isIrrelevant && !isSatire) ||
      categoryCounts["unsure"] > 0.5 * validResponseCount;

    const isAssessed =
      (isUnsure && validResponseCount > Math.min(0.8 * factCheckerCount, 16)) ||
      (!isUnsure && validResponseCount > Math.min(0.5 * factCheckerCount, 10)) ||
      (isBigSus && validResponseCount > Math.min(0.2 * factCheckerCount, 4)) ||
      (isHarmful && validResponseCount > Math.min(0.5 * factCheckerCount, 10)) ||
      (isHarmless && validResponseCount > Math.min(0.5 * factCheckerCount, 10));

    // Get responseCategory counts for downvote check
    const responseCategory = await getResponseCategoryCountsByPollId(dbService, pollId);
    if ("error" in responseCategory) {
      return { success: false, error: responseCategory.error as string };
    }

    const isDownvoted = responseCategory["unacceptable"] > 0.5 * validResponseCount && isAssessed;

    // Determine primary category
    let primaryCategory: string;
    switch (true) {
      case isScam:
        primaryCategory = "scam";
        break;
      case isSatire:
        primaryCategory = "satire";
        break;
      case isInfo:
        if (truthScore === null) {
          primaryCategory = "error";
          console.error("Category is info but truth score is null");
        } else if (truthScore < 1.5) {
          primaryCategory = "untrue";
        } else if (truthScore <= 3.75) {
          primaryCategory = "misleading";
        } else {
          primaryCategory = "accurate";
        }
        break;
      case isSpam:
        primaryCategory = "spam";
        break;
      case isLegitimate:
        primaryCategory = "legitimate";
        break;
      case isIrrelevant:
        primaryCategory = "irrelevant";
        break;
      case isUnsure:
        primaryCategory = "unsure";
        break;
      default:
        primaryCategory = "error";
        console.error("Error in primary category determination");
    }

    if (isAssessed) {
      return {
        success: true,
        data: { primaryCategory, truthScore, isDownvoted },
      };
    } else {
      return { success: true, data: null };
    }
  } catch (error) {
    console.error("Vote Assessment Error: ", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Vote Assessment error",
    };
  }
}

// Exported helper functions for use by other routes

export async function getCategoryCountsByPollId(
  dbService: DBService,
  pollId: string
): Promise<Record<string, number> | { error: string }> {
  const pipeline = [{ $group: { _id: "$category", count: { $sum: 1 } } }];
  const result = await dbService.getVotesDetails(pollId, pipeline);

  if (!result.success) {
    return { error: "Failed to retrieve category count" };
  }

  const map = new Map<string | null, number>();
  for (const row of result.data as Array<{ _id: string | null; count: number }>) {
    map.set(row._id, row.count);
  }

  const counts: Record<string, number> = {};
  for (const cat of ALL_CATEGORIES) {
    const key = cat === null ? "null" : cat;
    counts[key] = map.get(cat) ?? 0;
  }
  return counts;
}

async function getTotalVoteRequestsCount(
  dbService: DBService,
  pollId: string
): Promise<number | { error: string }> {
  const pipeline = [{ $count: "totalVoteRequestCount" }];
  const result = await dbService.getVotesDetails(pollId, pipeline);

  if (!result.success || !result.data?.[0]) {
    return { error: "Failed to retrieve total vote requests count" };
  }

  return (result.data as Array<{ totalVoteRequestCount: number }>)[0].totalVoteRequestCount;
}

async function getTotalTruthScoreValue(dbService: DBService, pollId: string): Promise<number> {
  const pipeline = [
    { $match: { truthScore: { $ne: null } } },
    { $group: { _id: null, totalTruthScore: { $sum: "$truthScore" } } },
  ];
  const result = await dbService.getVotesDetails(pollId, pipeline);

  return (result.data as Array<{ totalTruthScore: number }>)?.[0]?.totalTruthScore ?? 0;
}

function computeTruthScore(infoCount: number, voteTotal: number): number | null {
  if (infoCount === 0) return null;
  return voteTotal / infoCount;
}

export async function getResponseCategoryCountsByPollId(
  dbService: DBService,
  pollId: string
): Promise<Record<string, number> | { error: string }> {
  const pipeline = [{ $group: { _id: "$responseCategory", count: { $sum: 1 } } }];
  const result = await dbService.getVotesDetails(pollId, pipeline);

  if (!result.success) {
    return { error: "Failed to retrieve response category count" };
  }

  const map = new Map<string | null, number>();
  for (const row of result.data as Array<{ _id: string | null; count: number }>) {
    map.set(row._id, row.count);
  }

  const counts: Record<string, number> = {};
  for (const cat of ALL_RESPONSE_CATEGORIES) {
    const key = cat === null ? "null" : cat;
    counts[key] = map.get(cat) ?? 0;
  }
  return counts;
}
