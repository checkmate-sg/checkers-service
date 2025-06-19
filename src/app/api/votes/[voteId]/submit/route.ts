// src/app/api/votes/[voteid]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/lib/mongodb";

// Define the vote data interface
interface VoteData {
  checkerId: string;
  vote: string;
  category: string;
  tags: string[];
  aiRating: string;
  comment: string;
  votedAt: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { voteId: string } }
) {
  try {
    const voteId = params.voteId;
    const body = await request.json();

    // Validate required fields
    const { category, tags, aiRating, comment, checkerId } = body;

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    if (!aiRating) {
      return NextResponse.json(
        { error: "AI rating is required" },
        { status: 400 }
      );
    }

    if (!checkerId) {
      return NextResponse.json(
        { error: "Checker ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(voteId)) {
      return NextResponse.json(
        { error: "Invalid vote ID format" },
        { status: 400 }
      );
    }

    const db = await connectToDB();
    const votes = db.collection("votes");

    // Check if vote exists
    const existingVote = await votes.findOne({
      _id: new ObjectId(voteId),
    });

    if (!existingVote) {
      return NextResponse.json({ error: "Vote not found" }, { status: 404 });
    }

    // Check if voting is still open
    if (existingVote.status === "completed") {
      return NextResponse.json(
        { error: "Voting has been completed for this item" },
        { status: 400 }
      );
    }

    // Prepare the vote data with explicit typing
    const voteData: VoteData = {
      checkerId: String(checkerId),
      vote: String(category), // Store category as 'vote' field
      category: String(category), // Also store as 'category' for consistency
      tags: Array.isArray(tags) ? tags.map(String) : [],
      aiRating: String(aiRating),
      comment: comment ? String(comment).trim() : "",
      votedAt: new Date().toISOString(),
    };

    // Check if user has already voted
    const existingUserVoteIndex = existingVote.votes?.findIndex(
      (vote: any) => vote.checkerId === checkerId
    );

    let result;
    let isUpdate = false;

    if (existingUserVoteIndex !== undefined && existingUserVoteIndex >= 0) {
      // Update existing vote
      isUpdate = true;
      result = await votes.updateOne(
        { _id: new ObjectId(voteId) },
        {
          $set: {
            [`votes.${existingUserVoteIndex}`]: voteData,
          },
        }
      );
    } else {
      // Add new vote - MongoDB should accept this since votes is an array in the DB
      result = await votes.updateOne(
        { _id: new ObjectId(voteId) },
        {
          $push: {
            votes: voteData,
          },
        } as any // Apply type assertion to the entire update operation
      );
    }

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Vote not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to submit vote" },
        { status: 500 }
      );
    }

    // Get the updated vote to return current vote count
    const updatedVote = await votes.findOne({
      _id: new ObjectId(voteId),
    });

    return NextResponse.json({
      success: true,
      message: isUpdate
        ? "Vote updated successfully"
        : "Vote submitted successfully",
      voteCount: updatedVote?.votes?.length || 0,
      isUpdate,
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
