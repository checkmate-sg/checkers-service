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

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { voteId } = await params;
    if (!voteId) return Err.badParams("Missing voteId parameter");

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

    const { voteId } = await params;
    if (!voteId) return Err.badParams("Missing voteId parameter");

    const body = await req.json();

    if (!body || Object.keys(body).length === 0) {
      return Err.badParams();
    }

    const { category, truthScore, responseCategory, commentOnResponse, ...otherFields } = body;

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
