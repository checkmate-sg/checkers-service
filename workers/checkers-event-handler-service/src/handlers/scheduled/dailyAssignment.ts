import type { HandlerResult } from "../../types";

export async function runDailyAssignmentReset(env: Env) {
  console.log("resetting daily assignment for all checkers");
  const result = await env.CHECKERS_DB_SERVICE.updateManyCheckers(
    { isActive: true, onboardingStatus: "completed" },
    {
      $set: {
        dailyAssignmentCount: 0,
      },
    }
  );
  if (!result.success) {
    console.error("failed to reset daily assignment:", result.error);
  }
  console.log(`successfully reset daily assignment for ${result.modifiedCount} checkers`);
}
