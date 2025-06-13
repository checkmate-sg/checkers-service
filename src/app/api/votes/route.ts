// src/app/api/votes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDB();
    const checkers = db.collection("checkers");
    const votes = db.collection("votes");

    // For now, hardcode the checker ID - you'll want to get this from session/auth later
    const checkerId = "665eaaaa0000000000000001";

    // Get the checker's vote history
    const checker = await checkers.findOne({ _id: new ObjectId(checkerId) });
    if (!checker) {
      return NextResponse.json({ error: "Checker not found" }, { status: 404 });
    }

    // Get all votes
    const allVotes = await votes.find({}).toArray();

    // Create a map of voted items for quick lookup
    const votedMap = new Map();
    checker.voteHistory?.forEach((vote) => {
      votedMap.set(vote.voteId.toString(), vote);
    });

    // Transform votes into the format needed for My Votes page
    const myVotes = allVotes.map((vote) => {
      const myVoteData = votedMap.get(vote._id.toString());

      return {
        id: vote._id.toString(),
        content: vote.content,
        category: vote.category,
        status: myVoteData ? "voted" : "pending",
        myVote: myVoteData?.myVote || null,
        aiRating: myVoteData?.aiRating || null,
        timestamp: vote.timestamp,
        finalResult: vote.finalResult,
        votedAt: myVoteData?.votedAt || null,
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
