// app/api/votes/[voteId]/route.js
import { NextResponse } from "next/server";
import { connectToDB } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    const { voteId } = params;

    if (!voteId) {
      return NextResponse.json(
        { error: "Vote ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDB();

    // Fetch the vote from MongoDB
    const vote = await db.collection("votes").findOne({
      _id: new ObjectId(voteId),
    });

    if (!vote) {
      return NextResponse.json({ error: "Vote not found" }, { status: 404 });
    }

    return NextResponse.json(vote);
  } catch (error) {
    console.error("Error fetching vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
