import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getReportCount } from "@/lib/helpers/getReportCount";
import { computeAccuracyPercentage } from "@/shared/helpers/scoring";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GetCheckerStatsParamsSchema } from "@/validation/checker";

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsed = GetCheckerStatsParamsSchema.safeParse(resolvedParams);

    if (!parsed.success) {
      return Err.badParams("Invalid checkerId parameter");
    }

    const { checkerId } = parsed.data;

    if (checkerId.toString() !== session.user.id) {
      return Err.unauthorized();
    }

    // Get checker for whatsappId
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });
    if (!checkerResult.success || !checkerResult.data) {
      return Err.notFound();
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Query votes from the last 30 days
    const votesResult = await env.CHECKERS_DB_SERVICE.findVotes({
      checkerId,
      votedTimestamp: { $gte: thirtyDaysAgo },
    });

    if (!votesResult.success) {
      return Err.internal();
    }

    const votes = votesResult.data ?? [];
    const voteCount = votes.length;
    const accuracy = computeAccuracyPercentage(votes);

    // Get report count from the last 30 days
    const reportCount = await getReportCount(env, checkerResult.data.whatsappId, thirtyDaysAgo);

    return NextResponse.json(
      {
        voteCount,
        accuracy,
        reports: reportCount.count,
        maxDailyVotes: checkerResult.data.maxDailyVotes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error: ", error);
    return Err.internal();
  }
}
