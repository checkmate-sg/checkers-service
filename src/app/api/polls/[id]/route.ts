import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(req: NextRequest, { params }) {
  // Poll request --> To get the details of the Poll by _id
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { id } = await params;
    if (!id) return Err.badParams("Missing id parameter");

    const result = await env.CHECKERS_DB_SERVICE.findOnePoll({ _id: id });

    if (!result.success || !result.data) {
      return Err.notFound();
    }

    const poll = result.data;
    return NextResponse.json(poll, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
