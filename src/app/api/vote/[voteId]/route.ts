import { connectToDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { voteId: string } }
) {
  const db = await connectToDB();
  const vote = await db
    .collection("votes")
    .findOne({ _id: new ObjectId(params.voteId) });

  if (!vote)
    return NextResponse.json({ error: "Vote not found" }, { status: 404 });
  return NextResponse.json(vote);
}
