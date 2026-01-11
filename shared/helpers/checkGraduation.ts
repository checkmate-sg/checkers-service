import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";

export async function checkGraduation(
  env: CloudflareEnv,
  checkerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch checker and their active programme
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });

    if (!checkerResult.success || !checkerResult.data) {
      console.error(`Checker not found: ${checkerId}`);
      return { success: false, error: "Checker not found" };
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

    // Check vote count threshold
    if (checkersProgress.data.voteCount < programmeResult.data.targets.votes) return;

    // Check accuracy threshold
    if ((checkersProgress.data.accuracy ?? 0) < programmeResult.data.targets.accuracy) return;

    // Check reports threshold
    if (checkersProgress.data.reportCount < programmeResult.data.targets.reports) return;

    // Graduation Flow
    await graduateChecker(env, checkerId, checkerResult.data.currentProgrammeId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to check if checker graduated");

    return { success: false, error: errorMessage };
  }
}

export async function graduateChecker(env: CloudflareEnv, checkerId: string, programmeId: string) {
  const programmeUpdate = await env.CHECKERS_DB_SERVICE.updateOneProgramme(
    { _id: programmeId },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
      },
    }
  );

  if (!programmeUpdate.success || programmeUpdate.modifiedCount === 0) {
    return;
  }

  const checkerUpdate = await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { _id: checkerId },
    {
      $set: {
        currentProgrammeId: null,
      },
    }
  );

  if (!checkerUpdate.success || checkerUpdate.modifiedCount === 0) {
    return;
  }

  // TODO: Generate Certificate Utils

  // TODO: Set certificateUrl in programme collections

  // TODO: Send congratulations message
}
