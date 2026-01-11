import { Context } from "hono";

import type { ProgrammeAPI } from "./types";

export async function handleCheckerStatsWebhook(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  // Verify API key
  const apiKey = c.req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Get whatsappId from query parameter
    const whatsappId = c.req.query("whatsappId");
    if (!whatsappId) {
      return c.json({ error: "Missing 'whatsappId' query parameter" }, 400);
    }

    // Find checker by whatsappId
    const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({
      whatsappId: whatsappId,
    });

    if (!checkerResult.success) {
      console.error("[CHECKER-STATS ERROR]", checkerResult.error);
      return c.json({ error: checkerResult.error || "Failed to find checker" }, 500);
    }

    if (!checkerResult.data) {
      return c.json({ error: "Checker not found" }, 404);
    }

    const checker = checkerResult.data;

    // Find all programmes for this checker
    const programmesResult = await env.CHECKERS_DB_SERVICE.findProgrammes({
      checkerId: checker._id,
    });

    if (!programmesResult.success) {
      console.error("[CHECKER-STATS ERROR]", programmesResult.error);
      return c.json({ error: programmesResult.error || "Failed to find programmes" }, 500);
    }

    const programmes = programmesResult.data || [];

    // Find the earliest completedAt from all programmes
    let programEndTimestamp: Date | null = null;
    let hasCompletedProgram = false;
    let certificateUrl: string | null = null;

    // Filter programmes with completedAt and find the earliest one
    const completedProgrammes = programmes.filter(
      (p: ProgrammeAPI) => p.completedAt !== null && p.status === "completed"
    );

    if (completedProgrammes.length > 0) {
      hasCompletedProgram = true;
      // Sort by completedAt ascending to get the earliest
      completedProgrammes.sort((a: ProgrammeAPI, b: ProgrammeAPI) => {
        const dateA = new Date(a.completedAt!).getTime();
        const dateB = new Date(b.completedAt!).getTime();
        return dateA - dateB;
      });
      programEndTimestamp = completedProgrammes[0].completedAt;
      certificateUrl = completedProgrammes[0].certificateUrl;
    }

    return c.json({
      whatsappId: checker.whatsappId,
      onboardingStatus: checker.onboardingStatus,
      onboardingTime: checker.onboardingTime,
      hasCompletedProgram: hasCompletedProgram,
      programEndTimestamp: programEndTimestamp,
      certificateUrl: certificateUrl,
      offboardingTime: checker.offboardingTime,
    });
  } catch (err) {
    console.error("[CHECKER-STATS ERROR]", err);
    return c.json({ error: "Server error" }, 500);
  }
}
