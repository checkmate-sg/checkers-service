// src/app/api/dashboard/route.ts
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

    // Get the checker's data
    const checker = await checkers.findOne({ _id: new ObjectId(checkerId) });
    if (!checker) {
      return NextResponse.json({ error: "Checker not found" }, { status: 404 });
    }

    // Get all votes to calculate additional stats
    const allVotes = await votes.find({}).toArray();

    // Create a map of voted items for quick lookup
    const votedMap = new Map();
    checker.voteHistory?.forEach((vote) => {
      votedMap.set(vote.voteId.toString(), vote);
    });

    // Calculate stats
    const totalVotes = checker.voteHistory?.length || 0;
    const accuracy =
      totalVotes > 0
        ? Math.round((checker.correctVotes / totalVotes) * 100)
        : 0;

    // Determine certification status
    const isNewChecker = totalVotes < 50 || accuracy < 60; // Assuming messagesSent requirement is met

    // Create recent activity based on vote history
    const recentActivity = [];

    // Add recent votes
    if (checker.voteHistory && checker.voteHistory.length > 0) {
      const recentVotes = checker.voteHistory
        .slice(-3) // Get last 3 votes
        .reverse(); // Show most recent first

      recentVotes.forEach((vote, index) => {
        const voteDoc = allVotes.find(
          (v) => v._id.toString() === vote.voteId.toString()
        );
        if (voteDoc) {
          recentActivity.push({
            message: `Verified "${voteDoc.content.substring(0, 30)}..."`,
            date: formatRelativeTime(vote.votedAt),
            type: "vote",
          });
        }
      });
    }

    // Add achievement if accuracy milestone reached
    if (accuracy >= 60 && accuracy < 70) {
      recentActivity.push({
        message: "Achieved 60% accuracy milestone",
        date: "Recently",
        type: "achievement",
      });
    } else if (accuracy >= 70 && accuracy < 80) {
      recentActivity.push({
        message: "Achieved 70% accuracy milestone",
        date: "Recently",
        type: "achievement",
      });
    } else if (accuracy >= 80) {
      recentActivity.push({
        message: "Achieved 80% accuracy milestone",
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
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else {
    return `${days} days ago`;
  }
}
