import { Filter, UpdateFilter } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { Err } from "@/lib/api/error";
import {
  createVoteSubmittedEvent,
  publishCheckersEvent,
} from "@/lib/helpers/events/publishCheckersEvent";
import { Vote } from "@/lib/request/external/lib/data-contracts";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GetVoteParamsSchema, UpdateVoteBodySchema } from "@/validation/votes";

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    console.log("resolved:", resolvedParams);

    const parsedParams = GetVoteParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return Err.badParams("Invalid voteId parameter");
    }

    const { voteId } = parsedParams.data;

    const result = await env.CHECKERS_DB_SERVICE.findOneVote({
      _id: voteId,
    });

    if (!result.success) {
      return Err.notFound();
    }

    const vote = result.data;
    return NextResponse.json(vote, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}

export async function POST(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const resolvedParams = await params;

    const parsedParams = GetVoteParamsSchema.safeParse(resolvedParams);

    if (!parsedParams.success) {
      return Err.badParams("Invalid voteId parameter");
    }

    const { voteId } = parsedParams.data;

    console.log("successfully parsed: ", voteId);

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return Err.badParams("Invalid JSON body");
    }

    console.log("get body: ", body);

    const parsedBody = UpdateVoteBodySchema.safeParse(body);

    console.log("body: ", parsedBody);

    if (!parsedBody.success) {
      return Err.badParams(parsedBody.error.message);
    }

    const { category, truthScore, responseCategory, commentOnResponse, ...otherFields } =
      parsedBody.data;

    const filter: Filter<Vote> = { _id: voteId };

    // Only persist truthScore when category is "info"; clear it for other categories
    const effectiveTruthScore =
      category === undefined ? truthScore : category === "info" ? truthScore : null;

    const update: UpdateFilter<Vote> = {
      $set: {
        ...(category !== undefined && { category }),
        ...(effectiveTruthScore !== undefined && { truthScore: effectiveTruthScore }),
        ...(responseCategory !== undefined && { responseCategory }),
        ...(commentOnResponse !== undefined && { commentOnResponse }),
        ...otherFields,
        votedTimestamp: new Date(),
      },
    };

    const result = await env.CHECKERS_DB_SERVICE.updateOneVote(filter, update);

    if (!result.success) {
      return Err.internal("Failed to update vote");
    }

    if (result.modifiedCount === 0) {
      return Err.notFound("Vote not found or no changes made");
    }

    // Publish event for async processing (assessment + scoring)
    const eventResult = await publishCheckersEvent(env, createVoteSubmittedEvent({ voteId }));

    if (!eventResult.success) {
      console.error("Failed to publish vote.submitted event:", eventResult.error);
    }

    return NextResponse.json(
      {
        message: "Vote successfully updated",
        id: voteId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error updating the vote:", error);
    return Err.internal("Internal Server Error");
  }
}
