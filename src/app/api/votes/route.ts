// src/app/api/votes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDB();
    const votes = db.collection("votes");

    // For now, hardcode the checker ID - you'll want to get this from session/auth later
    const checkerId = "665eaaaa0000000000000001";

    // Get all votes and check if this checker has voted on each one
    const allVotes = await votes.find({}).toArray();

    // Transform votes into the format needed for My Votes page
    const myVotes = allVotes.map((vote) => {
      // Find if this checker has voted on this item
      const myVoteData = vote.votes?.find(
        (v) => v.checkerId.toString() === checkerId
      );

      return {
        id: vote._id.toString(),
        content: vote.content,
        category: vote.category,
        status: myVoteData ? "voted" : vote.status,
        myVote: myVoteData?.vote || null,
        aiRating: myVoteData?.aiRating || null,
        timestamp: vote.timestamp,
        finalResult: vote.finalResult,
        votedAt: myVoteData?.votedAt || null,
        aiNote: vote.aiNote?.summary || null,
      };
    });

    return NextResponse.json(myVotes);
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}
