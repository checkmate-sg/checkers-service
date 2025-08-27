import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PollRequest, PollAPI } from "@/shared/types/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json() as PollRequest;
    const { 
      checkId, 
      imageUrl, 
      caption, 
      text, 
      longformResponse, 
      shortformResponse 
    } = body;

    // Validate required fields
    if (!checkId) {
      return NextResponse.json(
        { error: "Missing 'checkId'" },
        { status: 400 }
      );
    }

    if (!shortformResponse) {
      return NextResponse.json(
        { error: "Missing 'shortformResponse'" },
        { status: 400 }
      );
    }

    // Get Cloudflare context and database service
    const { env } = await getCloudflareContext();

    // Check if poll with this checkId already exists
    const existingPollResult = await env.CHECKERS_DB_SERVICE.findOnePoll({ 
      externalId: checkId 
    });
    
    if (existingPollResult.success && existingPollResult.data) {
      return NextResponse.json(
        { 
          error: "Poll with this checkId already exists", 
          id: existingPollResult.data._id?.toString() || existingPollResult.data._id 
        },
        { status: 409 }
      );
    }

    // Create new poll (without _id, let the DB service handle it)
    const newPoll: Omit<PollAPI, "_id"> = {
      externalId: checkId,
      text: text || null,
      imageURl: imageUrl || null,
      caption: caption || null,
      longformResponse,
      shortformResponse,
      crowdSourcedCategory: null,
      startedTimestamp: new Date(),
      assessedTimestamp: null,
    };

    const insertResult = await env.CHECKERS_DB_SERVICE.insertPoll(newPoll);

    if (!insertResult.success) {
      console.error("[WEBHOOK ERROR]", insertResult.error);
      return NextResponse.json(
        { error: insertResult.error || "Failed to create poll" },
        { status: 500 }
      );
    }

    // Return the string ID from the database service
    return NextResponse.json({
      message: "Poll created successfully",
      id: insertResult.id,
    });
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
