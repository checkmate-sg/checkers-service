// src/app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/lib/mongodb";
import { processVotingLogic } from "@/lib/seed"; // Import the processing function

export async function GET(request: NextRequest) {
  try {
    const db = await connectToDB();
    const checkers = db.collection("checkers");
    const votes = db.collection("votes");

    // Process any pending votes before showing dashboard
    await processVotingLogic(votes, checkers);

    // For now, hardcode the checker ID - you'll want to get this from session/auth later
    const checkerId = "665eaaaa0000000000000001";

    // Get the checker's data (now without voteHistory)
    const checker = await checkers.findOne({ _id: new ObjectId(checkerId) });
    if (!checker) {
      return NextResponse.json({ error: "Checker not found" }, { status: 404 });
    }

    // Get recent votes where this checker participated for activity feed
    const recentVotesWithThisChecker = await votes
      .find({
        "votes.checkerId": new ObjectId(checkerId),
        status: "completed", // Only show completed votes in activity
      })
      .sort({ processedAt: -1 }) // Sort by when they were processed
      .limit(5)
      .toArray();

    // Calculate stats from checker document (now updated by processVotingLogic)
    const totalVotes = checker.totalVotes || 0;
    const correctVotes = checker.correctVotes || 0;
    const accuracy =
      totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;

    // Determine certification status
    const isNewChecker = totalVotes < 50 || accuracy < 60; // Assuming messagesSent requirement is met

    // Create recent activity based on completed votes
    const recentActivity = [];

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
        messagesSent: 1, // You'll need to track this separately or add to schema

        // Certified checker stats (same as above for now, but could be different)
        lifetimeVotes: totalVotes,
        lifetimeAccuracy: accuracy,
        engagementScore: Math.min(95, totalVotes * 2 + accuracy), // Simple calculation
        correctVotes: correctVotes, // Add this for more detailed stats if needed

        recentActivity: recentActivity.slice(0, 3), // Limit to 3 items
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
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
