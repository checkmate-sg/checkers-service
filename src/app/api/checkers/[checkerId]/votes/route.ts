import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GetCheckerVotesParamsSchema, GetCheckerVotesQuerySchema } from "@/validation/checker";

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsedParams = GetCheckerVotesParamsSchema.safeParse(resolvedParams);
    if (!parsedParams.success) {
      return Err.badParams("Invalid checkerId parameter");
    }

    const { checkerId } = parsedParams.data;

    if (checkerId.toString() !== session.user.id) {
      return Err.unauthorized();
    }

    const rawQuery = Object.fromEntries(req.nextUrl.searchParams.entries());

    const parsedQuery = GetCheckerVotesQuerySchema.safeParse(rawQuery);
    if (!parsedQuery.success) {
      return Err.badParams(parsedQuery.error.message);
    }

    const { sorting, limit = 50, offset = 0, VoteCheckerStatus } = parsedQuery.data;

    const baseFilter: any = {
      checkerId,
      voteCheckerStatus: VoteCheckerStatus,
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
