import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkerId } = await params;
    if (!checkerId) return Err.badParams("Missing checkerId parameter");

    const searchParams = req.nextUrl.searchParams;
    const sorting = searchParams.get("sorting") || "startedTimestamp";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")) : 0;
    const statusParam = searchParams.get("VoteCheckerStatus");
    const voteCheckerStatus =
      statusParam === "true" ? true : statusParam === "false" ? false : undefined; // no filter if missing

    const baseFilter = {
      checkerId,
      voteCheckerStatus,
    };

    const result = await env.CHECKERS_DB_SERVICE.findCheckersVote(
      sorting,
      offset,
      limit,
      baseFilter
    );

    const total = result.total;

    return NextResponse.json(
      {
        total: total,
        limit: limit,
        offset: offset,
        items: result.data,
      },
      { status: 200 }
    );
  } catch (error) {
    return Err.internal();
  }
}
