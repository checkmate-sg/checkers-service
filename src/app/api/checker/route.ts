import { connectToDB } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

// Simulate always returning same logged-in checker
export async function GET() {
  const db = await connectToDB();
  const checker = await db
    .collection("checkers")
    .findOne({ _id: new ObjectId("665eaaaa0000000000000001") });
  return NextResponse.json(checker);
}
