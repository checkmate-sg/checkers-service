import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";
import { getParameters } from "@/shared/helpers/parameters";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;

    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    // Fetch Checker's data
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });

    if (!checkerResult.success) {
      return Err.notFound();
    }

    if (checkerResult.data.currentProgrammeId === null) {
      // No active programme
      return NextResponse.json(
        {
          programme: null,
          progress: null,
        },
        { status: 200 }
      );
    }

    // Programme Result
    const programmeResult = await env.CHECKERS_DB_SERVICE.findOneProgramme({
      _id: checkerResult.data.currentProgrammeId,
    });

    if (!programmeResult.success) {
      return Err.notFound();
    }

    const programmeStats = await calculateProgrammeProgress(env, checkerId, {
      startDate: programmeResult.data.startDate,
      votesAtStart: programmeResult.data.votesAtStart,
    });

    if (!programmeStats.success || !programmeStats.data) {
      return Err.notFound();
    }

    // const daysRemaining =

    return NextResponse.json(
      {
        programme: programmeResult.data,
        progress: {
          votes: {
            current: programmeStats.data.voteCount,
            target: programmeResult.data.targets.votes,
          },
          accuracy: {
            current: programmeStats.data.accuracy,
            target: programmeResult.data.targets.accuracy,
          },
          reports: {
            current: programmeStats.data.reportCount,
            target: programmeResult.data.targets.reports,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error: ", error);
    return Err.internal();
  }
}

export async function POST(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    // Fetch checker
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });
    if (!checkerResult.success || !checkerResult.data) {
      return Err.notFound();
    }

    const checker = checkerResult.data;
    const now = new Date();

    // If existing programme, mark it as abandoned
    if (checker.currentProgrammeId) {
      await env.CHECKERS_DB_SERVICE.updateOneProgramme(
        { _id: checker.currentProgrammeId },
        {
          $set: {
            status: "abandoned",
            endDate: now,
          },
        }
      );
    }

    // Get programme targets from KV
    const { PROGRAMME_TARGET_VOTES, PROGRAMME_TARGET_ACCURACY, PROGRAMME_TARGET_REPORTS } =
      await getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
        "PROGRAMME_TARGET_VOTES",
        "PROGRAMME_TARGET_ACCURACY",
        "PROGRAMME_TARGET_REPORTS",
      ]);

    // Create new programme
    const programmeResult = await env.CHECKERS_DB_SERVICE.insertProgramme({
      checkerId: checker._id!,
      startDate: now,
      endDate: null,
      status: "active",
      targets: {
        votes: PROGRAMME_TARGET_VOTES,
        accuracy: PROGRAMME_TARGET_ACCURACY,
        reports: PROGRAMME_TARGET_REPORTS,
      },
      votesAtStart: checker.numVoted,
      hasReceivedExtension: false,
      hasReceivedLowAccuracyWarning: false,
      certificateUrl: null,
      completedAt: null,
    });

    if (!programmeResult.success) {
      console.error("Failed to create programme:", programmeResult.error);
      return Err.internal("Failed to create programme");
    }

    // Update checker with new programme ID
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: checkerId },
      { $set: { currentProgrammeId: programmeResult.id } }
    );

    return NextResponse.json({ programmeId: programmeResult.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating programme:", error);
    return Err.internal();
  }
}
