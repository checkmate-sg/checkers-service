import { NextResponse } from "next/server";
import { connectToDB } from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: { voteId: string } }
) {
  try {
    const voteId = params.voteId;

    console.log("voteId:", voteId);

    if (!voteId || !ObjectId.isValid(voteId)) {
      return NextResponse.json(
        { error: "Invalid or missing Vote ID" },
        { status: 400 }
      );
    }

    const db = await connectToDB();
    const vote = await db
      .collection("votes")
      .findOne({ _id: new ObjectId(voteId) });

    if (!vote) {
      return NextResponse.json({ error: "Vote not found" }, { status: 404 });
    }

    // Optional: format _id to id
    const { _id, ...rest } = vote;
    return NextResponse.json({ id: _id.toString(), ...rest });
  } catch (error) {
    console.error("Error fetching vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
