// src/app/api/votes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/shared/utils/mongodb";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    console.log("[Votes API] Starting votes data fetch");
    console.log("[Votes API] Request headers:", {
      cookie: request.headers.get("cookie"),
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    });

    // Try multiple ways to get the token for Telegram WebApp compatibility
    let token;

    // First try: standard getToken
    try {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
      console.log("[Votes API] Standard getToken result:", !!token);
    } catch (error) {
      console.log("[Votes API] Standard getToken failed:", error);
    }

    // Second try: getToken with different cookie names for Telegram WebApp
    if (!token) {
      try {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "__Secure-next-auth.session-token",
        });
        console.log("[Votes API] Secure cookie getToken result:", !!token);
      } catch (error) {
        console.log("[Votes API] Secure cookie getToken failed:", error);
      }
    }

    // Third try: non-secure cookie name for development
    if (!token) {
      try {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "next-auth.session-token",
        });
        console.log("[Votes API] Non-secure cookie getToken result:", !!token);
      } catch (error) {
        console.log("[Votes API] Non-secure cookie getToken failed:", error);
      }
    }

    // Fourth try: manual cookie parsing as fallback
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        console.log("[Votes API] Attempting manual cookie parsing");
        console.log("[Votes API] Available cookies:", cookieHeader);

        // Look for session tokens in cookies
        const sessionTokenMatch = cookieHeader.match(
          /(?:__Secure-)?next-auth\.session-token=([^;]+)/
        );
        if (sessionTokenMatch) {
          console.log(
            "[Votes API] Found session token in cookies, but getToken still failed"
          );
        }
      }
    }

    if (!token) {
      console.log("[Votes API] No valid session found after all attempts");
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: {
            hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
            cookieHeader:
              request.headers.get("cookie")?.substring(0, 100) + "...",
          },
        },
        { status: 401 }
      );
    }

    console.log("[Votes API] Session found for user:", {
      id: token.id,
      telegramId: token.telegramId,
      name: token.name,
    });

    const db = await connectToDB();
    const votes = db.collection("votes");

    // Use the actual user ID from the session
    const checkerId = token.id;
    console.log("[Votes API] Looking up votes for checker ID:", checkerId);

    // Get all votes and check if this checker has voted on each one
    const allVotes = await votes.find({}).toArray();

    console.log("[Votes API] Found", allVotes.length, "total votes");

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

    // Count votes where this user participated
    const votedCount = myVotes.filter((vote) => vote.myVote !== null).length;
    console.log(
      "[Votes API] User has voted on",
      votedCount,
      "out of",
      myVotes.length,
      "votes"
    );

    console.log("[Votes API] Returning", myVotes.length, "votes for user");
    return NextResponse.json(myVotes);
  } catch (error) {
    console.error("[Votes API] Error fetching votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}
