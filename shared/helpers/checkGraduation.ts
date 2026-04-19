import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";

interface CheckGraduationResult {
  success: boolean;
  graduated?: boolean;
  error?: string;
}

/**
 * Check if a checker has met all programme targets and should graduate.
 * If graduated, emits a "programme.completed" event for async processing.
 */
export async function checkGraduation(
  env: CloudflareEnv,
  checkerId: string
): Promise<CheckGraduationResult> {
  try {
    // Fetch checker and their active programme
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });

    if (!checkerResult.success || !checkerResult.data) {
      console.error(`Checker not found: ${checkerId}`);
      return { success: false, error: "Checker not found" };
    }

    // No active programme - nothing to check
    if (!checkerResult.data.currentProgrammeId) {
      return { success: true, graduated: false };
    }

    // Fetch checker's current programme
    const programmeResult = await env.CHECKERS_DB_SERVICE.findOneProgramme({
      _id: checkerResult.data.currentProgrammeId,
    });

    if (!programmeResult.success || !programmeResult.data) {
      console.error(`Programme not found: ${checkerResult.data.currentProgrammeId}`);
      return { success: false, error: "Programme not found" };
    }

    // Calculate checker's Programme progress
    const checkersProgress = await calculateProgrammeProgress(env, checkerId, {
      startDate: programmeResult.data.startDate,
      votesAtStart: programmeResult.data.votesAtStart,
    });

    if (!checkersProgress.success || !checkersProgress.data) {
      return { success: false, error: checkersProgress.error || "Failed to calculate progress" };
    }

    // Check vote count threshold
    if (checkersProgress.data.voteCount < programmeResult.data.targets.votes) {
      return { success: true, graduated: false };
    }

    // Check accuracy threshold
    if ((checkersProgress.data.accuracy ?? 0) < programmeResult.data.targets.accuracy) {
      return { success: true, graduated: false };
    }

    // Check reports threshold
    if (checkersProgress.data.reportCount < programmeResult.data.targets.reports) {
      return { success: true, graduated: false };
    }

    // All targets met - emit graduation event for async processing
    await env.CHECKERS_EVENTS_QUEUE.send({
      type: "programme.completed",
      data: {
        checkerId,
        programmeId: checkerResult.data.currentProgrammeId,
        stats: {
          voteCount: checkersProgress.data.voteCount,
          accuracy: checkersProgress.data.accuracy ?? 0,
          reportCount: checkersProgress.data.reportCount,
        },
      },
      timestamp: new Date().toISOString(),
    });

    console.log(`Emitted programme.completed event for checker ${checkerId}`);
    return { success: true, graduated: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to check if checker graduated:", errorMessage);

    return { success: false, error: errorMessage };
  }
}
