import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { calculateProgrammeProgress } from '@/lib/helpers/programmeProgress';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, { params }) {
    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        const { checkerId } = await params;

        if (!checkerId) return Err.badParams("Missing checkerId parameter");

        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const votesStats = await calculateProgrammeProgress(
            env, 
            checkerId, 
            {
                startDate: thirtyDaysAgo,
                votesAtStart: 0
            }
        )

        if (!votesStats.success || !votesStats.data) {
            return Err.notFound();
        }

        return NextResponse.json({
            voteCount: votesStats.data.voteCount,
            accuracy: votesStats.data.accuracy,
            reports: votesStats.data.reportCount
            }, {status: 200}
        )

    } catch (error) {
        console.log("Error: ", error);
        return Err.internal();
    }
}