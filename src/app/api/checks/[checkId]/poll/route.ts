import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  // Get poll details by checkId (checkId from CheckMate platform)
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { checkId } = await params;
    if (!checkId) return Err.badParams("Missing checkId parameter");

    const result = await env.CHECKERS_DB_SERVICE.findOnePoll({ checkId: checkId });

    if (!result.success || !result.data) {
      return Err.notFound();
    }

    const poll = result.data;
    return NextResponse.json(poll, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
