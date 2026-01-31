import { Context } from "hono";

import type { ProgrammeAPI } from "./types";

interface CheckerStatsResponse {
  whatsappId: string;
  onboardingStatus: string;
  onboardingTime: Date | null;
  hasCompletedProgram: boolean;
  programEndTimestamp: Date | null;
  certificateUrl: string | null;
  offboardingTime: Date | null;
}

export async function handleCheckerStatsWebhook(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  const apiKey = c.req.header("x-api-key");
  if (!apiKey || apiKey !== env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json<{ whatsappIds: string[] }>();

    if (!body.whatsappIds || !Array.isArray(body.whatsappIds)) {
      return c.json({ error: "Missing 'whatsappIds' array in request body" }, 400);
    }

    if (body.whatsappIds.length > 100) {
      return c.json({ error: "Maximum 100 whatsappIds per request" }, 400);
    }

    // Fetch all checkers in parallel
    const results = await Promise.all(
      body.whatsappIds.map(async whatsappId => {
        const stats = await getCheckerStats(env, whatsappId);
        return { whatsappId, stats };
      })
    );

    // Return as object keyed by whatsappId for easy lookup
    const resultsMap: Record<string, CheckerStatsResponse | null> = {};
    for (const { whatsappId, stats } of results) {
      resultsMap[whatsappId] = stats;
    }

    return c.json({ results: resultsMap });
  } catch (err) {
    console.error("[CHECKER-STATS ERROR]", err);
    return c.json({ error: "Server error" }, 500);
  }
}

async function getCheckerStats(env: Env, whatsappId: string): Promise<CheckerStatsResponse | null> {
  const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({
    whatsappId: whatsappId,
  });

  if (!checkerResult.success || !checkerResult.data) {
    return null;
  }

  const checker = checkerResult.data;

  const programmesResult = await env.CHECKERS_DB_SERVICE.findProgrammes({
    checkerId: checker._id,
  });

  if (!programmesResult.success) {
    console.error("[CHECKER-STATS ERROR]", programmesResult.error);
    return null;
  }

  const programmes = programmesResult.data || [];

  let programEndTimestamp: Date | null = null;
  let hasCompletedProgram = false;
  let certificateUrl: string | null = null;

  const completedProgrammes = programmes.filter(
    (p: ProgrammeAPI) => p.completedAt !== null && p.status === "completed"
  );

  if (completedProgrammes.length > 0) {
    hasCompletedProgram = true;
    completedProgrammes.sort((a: ProgrammeAPI, b: ProgrammeAPI) => {
      const dateA = new Date(a.completedAt!).getTime();
      const dateB = new Date(b.completedAt!).getTime();
      return dateA - dateB;
    });
    programEndTimestamp = completedProgrammes[0].completedAt;
    certificateUrl = completedProgrammes[0].certificateUrl;
  }

  return {
    whatsappId: checker.whatsappId,
    onboardingStatus: checker.onboardingStatus,
    onboardingTime: checker.onboardingTime,
    hasCompletedProgram,
    programEndTimestamp,
    certificateUrl,
    offboardingTime: checker.offboardingTime,
  };
}
