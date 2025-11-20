

import { Err } from '@/lib/api/error';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface CategoryCount { 
    category: String;
    count: number;
}

export const ALL_CATEGORIES: string[] = [
    "scam",
    "illicit",
    "info",
    "satire",
    "spam",
    "legitimate",
    "irrelevant",
    "unsure",
    "pass",
    null,
  ];

export const ALL_RESPONSE_CATEGORIES: string[] = [
  "great",
  "acceptable",
  "unacceptable",
  null
]

export async function getCategoryCountsByPollId(pollId: string) {

    const { env } = getCloudflareContext();

    try {
        // Get Category Count 
        const categoryPipeline: any[] = [
            {
              $group:
                {
                  _id: "$category",
                  count: {
                    $sum: 1
                  }
                }
            }
          ]

        const rawCategoryCount = await env.CHECKERS_DB_SERVICE.getVotesDetails(pollId, categoryPipeline)

        if (!rawCategoryCount.success){
            return Err.internal("Failed to retrieve category count")
        }

        // Convert to a lookup map 
        const map = new Map<String, number>();
        for (const row of rawCategoryCount.data) {
            map.set(row._id ?? null, row.count)
        }

        const categoryCounts: Record<string, number> = {};
        for (const cat of ALL_CATEGORIES) {
            const key = cat === null ? 'null' : cat; // use 'null' string for JSON key
            categoryCounts[key] = map.get(cat) ?? 0;
        }

        return categoryCounts
    } catch (error) {
        console.error("Error getting category count: ", error);
        return Err.internal("Error getting category count");
    }
}

export async function getTotalVoteRequestsCount(pollId: string) {
  const { env } = getCloudflareContext();

  try {
     // Get totalVoteRequestCount 
     const totalVotePipeline: any[] = [
          {$count: "totalVoteRequestCount"}
      ]

      const rawTotalVoteRequestsCount = await env.CHECKERS_DB_SERVICE.getVotesDetails(pollId, totalVotePipeline);

      if (!rawTotalVoteRequestsCount.success){
          return Err.internal("Failed to retrieve total vote requests count")
      }

      const totalVoteRequestsCount = rawTotalVoteRequestsCount?.data[0].totalVoteRequestCount

      return totalVoteRequestsCount;
  } catch (error) {
    console.error("Error getting total vote requests count: ", error);
    return Err.internal("Error getting total vote requests count");
  }
}

export async function getTotalTruthScoreValue(pollId: string) {
  const { env } = getCloudflareContext();

  try {
    // Get total truthScore value 
    const totalTruthScorePipeline: any[] = [
      {
        $match: {
          truthScore: {$ne: null}
        }
      },
      {
        $group:
          {
            _id: null, 
            totalTruthScore: {
              $sum: "$truthScore"
            }
          }
      }
    ]

    const rawTotalTruthScoreValue = await env.CHECKERS_DB_SERVICE.getVotesDetails(pollId, totalTruthScorePipeline);

    const truthScoreValue = rawTotalTruthScoreValue?.data[0].totalTruthScore;

    return truthScoreValue;
  } catch (error) {
    console.error("Error getting total truthScore value: ", error);
    return Err.internal("Error getting total truthScore value")
  }
}

export async function computeTruthScore(infoCount: number, voteTotal: number) {
  if (infoCount === 0) {
    return null
  }
  return voteTotal / infoCount;
}

export async function getResponseCategoryCountsByPollId(pollId: string) {
  const { env } = getCloudflareContext();

  try {
    // Get responseCategory Count 
    const responseCategoryPipeline: any[] = [
      {
        $group: {
          _id: "$responseCategory",
          count: {
            $sum: 1
          }
        }
      }
    ]

    const rawResponseCategoryCount = await env.CHECKERS_DB_SERVICE.getVotesDetails(pollId, responseCategoryPipeline);

    if (!rawResponseCategoryCount.success) {
      return Err.internal("Failed to retrieve category count");
    }

    // Convert to a lookup map
    const map = new Map<String, number>();
    for (const row of rawResponseCategoryCount.data) {
      map.set(row._id??null, row.count);
    }

    const responseCategoryCounts: Record<string, number> = {};
    for (const cat of ALL_RESPONSE_CATEGORIES) {
      const key = cat === null ? 'null' : cat; //use 'null' string for JSON key 
      responseCategoryCounts[key] = map.get(cat) ?? 0;
    }

    return responseCategoryCounts;
  } catch (error) {
    console.error("Error getting category count: ", error);
    return Err.internal("Error getting category count");
  }
}