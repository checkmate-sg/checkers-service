import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GetPollParamsSchema } from "@/validation/polls";

export async function GET(req: NextRequest, { params }) {
  // Poll request --> To get the details of the Poll by _id
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsedParams = GetPollParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return Err.badParams("Invalid poll id");
    }

    const { id } = parsedParams.data;

    const result = await env.CHECKERS_DB_SERVICE.findOnePoll({ _id: id });

    if (!result.success || !result.data) {
      return Err.notFound();
    }

    const poll = result.data;

    if (env.ENVIRONMENT !== "local" && poll.imageUrl) {
      poll.imageUrl = await env.PRESIGNED_URL_SERVICE!.generate(poll.imageUrl);
    }

    return NextResponse.json(poll, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}
