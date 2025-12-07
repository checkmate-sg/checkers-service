// src/app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDB } from "@/shared/utils/mongodb";
import { processVotingLogic } from "@/lib/seed";
import { getToken } from "next-auth/jwt";

interface LeaderboardEntry {
  rank: number;
  name: string;
  votes: number;
  accuracy: number;
  badges: string[];
  points: number;
  isCurrentUser?: boolean;
  _id?: ObjectId;
}

export async function GET(request: NextRequest) {
  try {
    console.log("[Leaderboard API] Starting leaderboard data fetch");

    // Get session token (using same logic as dashboard API)
    let token;

    // Try multiple ways to get the token for Telegram WebApp compatibility
    try {
      token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      });
    } catch (error) {
      console.log("[Leaderboard API] Standard getToken failed:", error);
    }

    if (!token) {
      try {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "__Secure-next-auth.session-token",
        });
      } catch (error) {
        console.log("[Leaderboard API] Secure cookie getToken failed:", error);
      }
    }

    if (!token) {
      try {
        token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET,
          cookieName: "next-auth.session-token",
        });
      } catch (error) {
        console.log("[Leaderboard API] Non-secure cookie getToken failed:", error);
      }
    }

    const db = await connectToDB();
    const checkers = db.collection("checkers");
    const votes = db.collection("votes");

    // Process any pending votes before calculating leaderboard
    await processVotingLogic(votes, checkers);

    // Get all checkers with their stats
    const allCheckers = await checkers
      .find({
        totalVotes: { $gte: 1 }, // Only include checkers who have voted at least once
      })
      .toArray();

    console.log("[Leaderboard API] Found", allCheckers.length, "checkers");

    // Calculate points and create leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = allCheckers.map(checker => {
      const totalVotes = checker.totalVotes || 0;
      const correctVotes = checker.correctVotes || 0;
      const accuracy = totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;

      // Calculate points (you can adjust this formula)
      const basePoints = totalVotes * 10; // 10 points per vote
      const accuracyBonus = accuracy >= 80 ? totalVotes * 5 : 0; // Bonus for high accuracy
      const points = basePoints + accuracyBonus;

      // Determine badges based on performance
      const badges = getBadges(totalVotes, accuracy, correctVotes);

      return {
        _id: checker._id,
        name: checker.name || "Unknown User",
        votes: totalVotes,
        accuracy: accuracy,
        points: points,
        badges: badges,
        rank: 0, // Will be set after sorting
      };
    });

    // Sort by points (descending)
    leaderboardEntries.sort((a, b) => b.points - a.points);

    // Assign ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find current user and mark them
    let currentUserId: string | null = null;
    let currentUserEntry: LeaderboardEntry | null = null;

    if (token && token.id) {
      currentUserId = token.id;
      currentUserEntry =
        leaderboardEntries.find(entry => entry._id?.toString() === currentUserId) || null;

      if (currentUserEntry) {
        currentUserEntry.isCurrentUser = true;
      }
    }

    // Determine what to return based on current user's position
    let responseEntries: LeaderboardEntry[];

    if (!currentUserEntry || currentUserEntry.rank <= 3) {
      // If no current user or they're in top 3, return top 3
      responseEntries = leaderboardEntries.slice(0, 3);
    } else {
      // If current user is not in top 3, return top 3 + current user
      const top3 = leaderboardEntries.slice(0, 3);
      responseEntries = [...top3, currentUserEntry];
    }

    // Remove _id from response for security
    const finalEntries = responseEntries.map(({ _id, ...entry }) => entry);

    // Get total number of participants
    const totalParticipants = leaderboardEntries.length;

    console.log("[Leaderboard API] Returning", finalEntries.length, "entries");

    return NextResponse.json({
      leaderboard: finalEntries,
      totalParticipants: totalParticipants,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Leaderboard API] Error fetching leaderboard data:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard data" }, { status: 500 });
  }
}

// Helper function to determine badges based on performance
function getBadges(totalVotes: number, accuracy: number, correctVotes: number): string[] {
  const badges: string[] = [];

  // Vote-based badges
  if (totalVotes >= 300) {
    badges.push("Top Voter");
  } else if (totalVotes >= 200) {
    badges.push("Consistent Checker");
  } else if (totalVotes >= 100) {
    badges.push("Dedicated Checker");
  } else if (totalVotes >= 50) {
    badges.push("Rising Star");
  } else if (totalVotes >= 10) {
    badges.push("New Talent");
  } else {
    badges.push("Getting Started");
  }

  // Accuracy-based badges
  if (accuracy >= 94) {
    badges.push("Accuracy Expert");
  } else if (accuracy >= 85) {
    badges.push("Quality Voter");
  }

  // Special badges based on combinations
  if (totalVotes >= 250 && accuracy >= 90) {
    badges.push("Elite Checker");
  }

  if (accuracy >= 80 && totalVotes >= 100) {
    badges.push("Reliable Validator");
  }

  // Weekly streak badge (you'd need to track this separately)
  // For now, randomly assign to top performers
  if (totalVotes >= 50 && accuracy >= 80 && Math.random() > 0.7) {
    badges.push("Week Streak");
  }

  // Fast responder badge (you'd need to track response times)
  if (totalVotes >= 100 && accuracy >= 85 && Math.random() > 0.8) {
    badges.push("Fast Responder");
  }

  // Team player badge (based on helping others - placeholder logic)
  if (totalVotes >= 150 && accuracy >= 75) {
    badges.push("Team Player");
  }

  return badges;
}
