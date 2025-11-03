import { NextResponse } from 'next/server';

import { createInlineKeyboard, sendMessage } from '@/lib/telegramHelpers/telegram';
import { PollAPI, PollRequest, VoteAPI } from '@/shared/types/schema';
import { getCloudflareContext } from '@opennextjs/cloudflare';

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

    console.log(existingPollResult.data);
    
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
      imageURL: imageUrl || null,
      caption: caption || null,
      longformResponse,
      shortformResponse,
      crowdSourcedCategory: null,
      startedTimestamp: new Date(),
      assessedTimestamp: null,
    };

    // Insert the new poll into the database
    const insertResult = await env.CHECKERS_DB_SERVICE.insertPoll(newPoll);

    if (!insertResult.success) {
      console.error("[WEBHOOK ERROR]", insertResult.error);
      return NextResponse.json(
        { error: insertResult.error || "Failed to create poll" },
        { status: 500 }
      );
    }

    // Builds a previewText for notification
    let previewText = "";
    if (text) {
      previewText = text.length > 50 ? text.substring(0, 50) + "..." : text
    }

    if (imageUrl) {
      previewText = previewText ? `${previewText}\n <Image 🖼️>` : "<Image 🖼️>"
    }

    // Despatch Poll 
    // Get all the active checkers who is currently active 
    const activeCheckersResult = await env.CHECKERS_DB_SERVICE.findCheckers({
      isActive: true,
      isOnboardingComplete: true,
    }, {dailyAssignmentCount: 1}); // activeCheckerResult.data is Checker[]

    for (const checker of activeCheckersResult.data) {
      // Create a vote request in the database for each checker
      const voteRequest: Omit<VoteAPI, "_id"> = {
        pollId: checkId, 
        checkerId: checker._id?.toString() || checker._id,
        createdTimestamp: new Date(),
        votedTimestamp: null,
        category: null, 
        truthScore: null,
        responseCategory: null,
        commentOnResponse: null,
      }
      const insertVoteResult = await env.CHECKERS_DB_SERVICE.insertVote(voteRequest);

      if (!insertVoteResult.success) {
        console.error("[WEBHOOK ERROR]", insertVoteResult.error);
        return NextResponse.json(
          { error: insertVoteResult.error || "Failed to create poll" },
          { status: 500 }
        );
      }

      const voteRequestPath = `${process.env.TELEGRAM_VOTE_REQUEST}/votes/${insertVoteResult.id}`;

      // Send each checker the vote request message 
      await sendMessage(
        checker.telegramId,
        previewText,
        {
          reply_markup: createInlineKeyboard([
            [
              { text: "Vote 🗳️!",
                web_app: {url: voteRequestPath}
              }
            ]
          ])
        }
      )
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

