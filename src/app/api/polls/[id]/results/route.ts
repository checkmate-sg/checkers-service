import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import {
  getCategoryCountsByPollId,
  getResponseCategoryCountsByPollId,
} from "@/shared/helpers/voteAssessment";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  // Get and calculate the results/statistics for a specific poll by _id

  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { id } = await params;
    if (!id) return Err.badParams("Missing id parameter");

    const categoryCountResult = await getCategoryCountsByPollId(env.CHECKERS_DB_SERVICE, id);
    if ("error" in categoryCountResult) return Err.internal(categoryCountResult.error);
    const categoryCount = categoryCountResult;

    // Only if 'info' is part of the categories -> then we will compute the truthScore statistics
    const truthScorePipeline: any[] = [
      {
        $match: {
          truthScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$truthScore",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];
    const pollTruthScoreStatistics = await env.CHECKERS_DB_SERVICE.getVotesDetails(
      id,
      truthScorePipeline
    );

    // Initialize all scores 0-5 with count 0
    const truthScoreStats: Record<string, number> = {
      total: categoryCount["info"],
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    // Fill in actual counts from database
    pollTruthScoreStatistics.data.forEach((item: { _id: number; count: number }) => {
      truthScoreStats[item._id] = item.count;
    });

    const responseCategoryResult = await getResponseCategoryCountsByPollId(
      env.CHECKERS_DB_SERVICE,
      id
    );
    if ("error" in responseCategoryResult) return Err.internal(responseCategoryResult.error);
    const responseCategoryCounts = responseCategoryResult;

    // Build final stats, excluding null keys from both category counts
    const { null: _catNull, ...categoryStatsWithoutNull } = categoryCount as Record<
      string,
      number
    > & { null?: number };
    const { null: _respNull, ...responseStatsWithoutNull } = responseCategoryCounts as Record<
      string,
      number
    > & { null?: number };

    const finalStats = {
      ...categoryStatsWithoutNull,
      info: truthScoreStats,
      great: responseStatsWithoutNull["great"],
      acceptable: responseStatsWithoutNull["acceptable"],
      unacceptable: responseStatsWithoutNull["unacceptable"],
    };

    return NextResponse.json(finalStats, { status: 200 });
  } catch (error) {
    console.error("Error getting poll statistics: ", error);
    return Err.internal("Error getting poll statistics");
  }
}
