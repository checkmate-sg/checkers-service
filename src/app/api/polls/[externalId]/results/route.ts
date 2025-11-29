import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import {
  getCategoryCountsByPollId,
  getResponseCategoryCountsByPollId
} from '@/lib/helpers/voteAssessment/voteAssessmentUtils';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, {params}){
    // Get and calculate the results/statistics for a specific poll by externalId/pollId

    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        const {externalId} = await params;
        if (!externalId) return Err.badParams("Missing externalId parameter");

        const categoryCount = await getCategoryCountsByPollId(externalId);
        console.log(categoryCount);

        // Only if 'info' is part of the categories -> then we will compute the truthScore statistics
        const truthScorePipeline: any[] = [
            {
                $match: {
                    truthScore: {$ne: null}
                }
            },
            {
                $group: {
                    _id: "$truthScore",
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]
        const pollTruthScoreStatistics = await env.CHECKERS_DB_SERVICE.getVotesDetails(externalId, truthScorePipeline);

        // Initialize all scores 0-5 with count 0
        const truthScoreStats: Record<string, number> = {
            total: categoryCount['info'],
            0: 0,
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
        };
        
        // Fill in actual counts from database
        pollTruthScoreStatistics.data.forEach((item: { _id: number; count: number }) => {
            truthScoreStats[item._id] = item.count;
        });
        

        categoryCount['info'] = truthScoreStats;

        const responseCategoryCounts = await getResponseCategoryCountsByPollId(externalId);
        console.log(responseCategoryCounts);

        const combinedStats = {
            ...categoryCount,
            great: responseCategoryCounts['great'],
            acceptable: responseCategoryCounts['acceptable'],
            unacceptable: responseCategoryCounts['unacceptable']
        }

        const { null: _, ...finalStats } = combinedStats;
        
        return NextResponse.json(finalStats, {status: 200})

    } catch(error){
        console.error("Error getting poll statistics: ", error);
        return Err.internal("Error getting poll statistics");
    }
}