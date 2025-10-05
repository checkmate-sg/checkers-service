// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/shared/utils/mongodb";
import { processVotingLogic } from "@/lib/seed";
import { getToken } from "next-auth/jwt";

export async function GET(request: NextRequest) {
  try {
    console.log("[Dashboard API] Starting dashboard data fetch");
    console.log("[Dashboard API] Request headers:", {
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
      console.log("[Dashboard API] Standard getToken result:", !!token);
    } catch (error) {
      console.log("[Dashboard API] Standard getToken failed:", error);
    }

    // Second try: getToken with different cookie names for Telegram WebApp
    if (!token) {
      try {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "__Secure-next-auth.session-token",
        });
        console.log("[Dashboard API] Secure cookie getToken result:", !!token);
      } catch (error) {
        console.log("[Dashboard API] Secure cookie getToken failed:", error);
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
        console.log(
          "[Dashboard API] Non-secure cookie getToken result:",
          !!token
        );
      } catch (error) {
        console.log(
          "[Dashboard API] Non-secure cookie getToken failed:",
          error
        );
      }
    }

    // Fourth try: manual cookie parsing as fallback
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        console.log("[Dashboard API] Attempting manual cookie parsing");
        console.log("[Dashboard API] Available cookies:", cookieHeader);

        // Look for session tokens in cookies
        const sessionTokenMatch = cookieHeader.match(
          /(?:__Secure-)?next-auth\.session-token=([^;]+)/
        );
        if (sessionTokenMatch) {
          console.log(
            "[Dashboard API] Found session token in cookies, but getToken still failed"
          );
        }
      }
    }

    if (!token) {
      console.log("[Dashboard API] No valid session found after all attempts");
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

    console.log("[Dashboard API] Session found for user:", {
      id: token.id,
      telegramId: token.telegramId,
      name: token.name,
    });

    const db = await connectToDB();
    const checkers = db.collection("checkers");
    const votes = db.collection("votes");

    // Process any pending votes before showing dashboard
    await processVotingLogic(votes, checkers);

    // Use the actual user ID from the session
    const checkerId = token.id;
    console.log("[Dashboard API] Looking up checker with ID:", checkerId);

    // Get the checker's data
    const checker = await checkers.findOne({ _id: new ObjectId(checkerId) });
    if (!checker) {
      console.log("[Dashboard API] Checker not found with ID:", checkerId);
      return NextResponse.json({ error: "Checker not found" }, { status: 404 });
    }

    console.log("[Dashboard API] Checker found:", {
      name: checker.name,
      totalVotes: checker.totalVotes,
      correctVotes: checker.correctVotes,
    });

    // Get recent votes where this checker participated for activity feed
    const recentVotesWithThisChecker = await votes
      .find({
        "votes.checkerId": new ObjectId(checkerId),
        status: "completed", // Only show completed votes in activity
      })
      .sort({ processedAt: -1 }) // Sort by when they were processed
      .limit(5)
      .toArray();

    console.log(
      "[Dashboard API] Found",
      recentVotesWithThisChecker.length,
      "recent votes"
    );

    // Calculate stats from checker document (now updated by processVotingLogic)
    const totalVotes = checker.totalVotes || 0;
    const correctVotes = checker.correctVotes || 0;
    const accuracy =
      totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;

    // Determine certification status
    const isNewChecker = totalVotes < 50 || accuracy < 60; // Assuming messagesSent requirement is met

    // Create recent activity based on completed votes
    const recentActivity = [] as {
      message: string;
      date: string;
      type: string;
    }[];

    // Add recent votes from completed votes
    recentVotesWithThisChecker.forEach((voteDoc) => {
      // Find this checker's vote in the votes array
      const myVote = voteDoc.votes.find(
        (v) => v.checkerId.toString() === checkerId
      );
      if (myVote) {
        const wasCorrect =
          voteDoc.finalResult && voteDoc.finalResult.includes(myVote.vote);
        recentActivity.push({
          message: `${
            wasCorrect ? "✅" : "❌"
          } Verified "${voteDoc.content.substring(0, 30)}..."`,
          date: formatRelativeTime(voteDoc.processedAt || voteDoc.timestamp),
          type: "vote",
        });
      }
    });

    // Add achievement if accuracy milestone reached
    if (accuracy >= 60 && accuracy < 70) {
      recentActivity.push({
        message: "🎯 Achieved 60% accuracy milestone",
        date: "Recently",
        type: "achievement",
      });
    } else if (accuracy >= 70 && accuracy < 80) {
      recentActivity.push({
        message: "🎯 Achieved 70% accuracy milestone",
        date: "Recently",
        type: "achievement",
      });
    } else if (accuracy >= 80 && accuracy < 90) {
      recentActivity.push({
        message: "🎯 Achieved 80% accuracy milestone",
        date: "Recently",
        type: "achievement",
      });
    } else if (accuracy >= 90) {
      recentActivity.push({
        message: "🏆 Achieved 90% accuracy milestone - Expert level!",
        date: "Recently",
        type: "achievement",
      });
    }

    // Dashboard data structure
    const dashboardData = {
      isNewChecker,
      userData: {
        name: checker.name,
        // New checker stats
        votes: totalVotes,
        accuracy: accuracy,
        messagesSent: checker.numReferred, //this maybe wrong

        // Certified checker stats (same as above for now, but could be different)
        lifetimeVotes: totalVotes,
        lifetimeAccuracy: accuracy,
        engagementScore: Math.min(95, totalVotes * 2 + accuracy), // Simple calculation
        correctVotes: correctVotes, // Add this for more detailed stats if needed

        recentActivity: recentActivity.slice(0, 3), // Limit to 3 items
      },
    };

    console.log("[Dashboard API] Returning dashboard data:", dashboardData);
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("[Dashboard API] Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Helper function to format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === "string" ? new Date(date) : date;
  const diff = now.getTime() - targetDate.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else {
    return targetDate.toLocaleDateString();
  }
}
