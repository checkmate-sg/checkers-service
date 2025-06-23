import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, screenshot, sender } = body;

    if (!content || !sender) {
      return NextResponse.json(
        { error: "Missing 'content' or 'sender'" },
        { status: 400 }
      );
    }

    const db = await connectToDB();
    const votesCollection = db.collection("votes");

    const newVote = {
      _id: new ObjectId(),
      content,
      screenshot: screenshot || null,
      sender,
      timestamp: new Date(),
      category: "Pending",
      status: "pending",
      finalResult: null,
      votes: [],
      aiNote: null,
    };

    await votesCollection.insertOne(newVote);

    return NextResponse.json({
      message: "Vote submitted successfully",
      id: newVote._id,
    });
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
