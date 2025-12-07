import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  // Poll request --> To get the details of the Poll
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { externalId } = await params;
    if (!externalId) return Err.badParams("Missing externalId parameter");

    const result = await env.CHECKERS_DB_SERVICE.findOnePoll({ externalId: externalId });

    if (!result.success) {
      return Err.notFound();
    }

    const poll = result.data;
    return NextResponse.json(poll, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
