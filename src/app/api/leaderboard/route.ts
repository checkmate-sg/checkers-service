import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    // Calculate current month's date range in SGT (UTC+8)
    // Cloudflare Workers run in UTC, so we need to offset to SGT
    const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
    const now = new Date();
    const nowSGT = new Date(now.getTime() + SGT_OFFSET_MS);

    // Get year/month as it would be in SGT
    const year = nowSGT.getUTCFullYear();
    const month = nowSGT.getUTCMonth();

    // Create UTC timestamps that represent midnight SGT
    // e.g., Jan 1 2026 00:00 SGT = Dec 31 2025 16:00 UTC
    const startOfMonth = new Date(Date.UTC(year, month, 1) - SGT_OFFSET_MS);
    const startOfNextMonth = new Date(Date.UTC(year, month + 1, 1) - SGT_OFFSET_MS);

    const result = await env.CHECKERS_DB_SERVICE.getLeaderboardInfo(startOfMonth, startOfNextMonth);

    if (!result.success) {
      return Err.notFound();
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
