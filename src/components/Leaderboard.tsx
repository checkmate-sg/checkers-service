import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Star, Loader2, RefreshCw } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  name: string;
  votes: number;
  accuracy: number;
  badges: string[];
  points: number;
  isCurrentUser?: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: string;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    []
  );
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchLeaderboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch("/api/leaderboard", {
        method: "GET",
        credentials: "include", // Important for session cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const data: LeaderboardData = await response.json();

      setLeaderboardData(data.leaderboard);
      setTotalParticipants(data.totalParticipants);
      setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString());
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-500" size={20} />;
      case 2:
        return <Medal className="text-gray-400" size={20} />;
      case 3:
        return <Award className="text-amber-600" size={20} />;
      default:
        return <span className="text-gray-600 font-bold">#{rank}</span>;
    }
  };

  const getBadgeColor = (badge: string) => {
    const colors: { [key: string]: string } = {
      "Top Voter": "bg-checkmate-primary text-white",
      "Accuracy Expert": "bg-green-500 text-white",
      "Week Streak": "bg-blue-500 text-white",
      "Consistent Checker": "bg-purple-500 text-white",
      "Fast Responder": "bg-orange-500 text-white",
      "Team Player": "bg-pink-500 text-white",
      "Quality Voter": "bg-indigo-500 text-white",
      "Rising Star": "bg-yellow-500 text-black",
      "Dedicated Checker": "bg-cyan-500 text-white",
      "New Talent": "bg-lime-500 text-black",
      "Getting Started": "bg-gray-500 text-white",
      "Elite Checker":
        "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
      "Reliable Validator": "bg-teal-500 text-white",
    };
    return colors[badge] || "bg-gray-500 text-white";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-checkmate-primary" size={32} />
          <span className="ml-2 text-gray-600">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-red-600 mb-2">Failed to load leaderboard</p>
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button
              onClick={() => fetchLeaderboard()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const top3 = leaderboardData.slice(0, 3);
  const remainingEntries = leaderboardData.slice(3);

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-checkmate-text">
            Leaderboard
          </h1>
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            className="p-1 text-gray-500 hover:text-checkmate-primary"
            title="Refresh leaderboard"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        <p className="text-gray-600 text-sm">
          Top CheckMate contributors ({totalParticipants} total)
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">Updated at {lastUpdated}</p>
        )}
      </div>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <Card className="mb-6 bg-gradient-to-br from-checkmate-secondary to-white">
          <CardContent className="p-6">
            <div className="flex justify-center items-end gap-4">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="text-center">
                  <Avatar className="mx-auto mb-2 w-12 h-12">
                    <AvatarFallback className="bg-gray-400 text-white">
                      {getInitials(top3[1].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-400 text-white px-2 py-4 rounded-lg">
                    <div className="text-xs font-bold">2nd</div>
                    <div className="text-xs">{top3[1].votes} votes</div>
                    <div className="text-xs">{top3[1].accuracy}%</div>
                  </div>
                  <p className="text-xs mt-1 font-medium">{top3[1].name}</p>
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div className="text-center">
                  <Avatar className="mx-auto mb-2 w-16 h-16">
                    <AvatarFallback className="bg-checkmate-primary text-white">
                      {getInitials(top3[0].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-checkmate-primary text-white px-3 py-6 rounded-lg">
                    <Trophy className="mx-auto mb-1" size={16} />
                    <div className="text-xs font-bold">1st</div>
                    <div className="text-xs">{top3[0].votes} votes</div>
                    <div className="text-xs">{top3[0].accuracy}%</div>
                  </div>
                  <p className="text-xs mt-1 font-medium">{top3[0].name}</p>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="text-center">
                  <Avatar className="mx-auto mb-2 w-12 h-12">
                    <AvatarFallback className="bg-amber-600 text-white">
                      {getInitials(top3[2].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-amber-600 text-white px-2 py-4 rounded-lg">
                    <div className="text-xs font-bold">3rd</div>
                    <div className="text-xs">{top3[2].votes} votes</div>
                    <div className="text-xs">{top3[2].accuracy}%</div>
                  </div>
                  <p className="text-xs mt-1 font-medium">{top3[2].name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Rankings */}
      {leaderboardData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Full Rankings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0">
              {leaderboardData.map((user) => (
                <div
                  key={user.rank}
                  className={`p-4 border-b last:border-b-0 ${
                    user.isCurrentUser
                      ? "bg-checkmate-info"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {getRankIcon(user.rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarFallback
                        className={
                          user.isCurrentUser
                            ? "bg-checkmate-primary text-white"
                            : ""
                        }
                      >
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`font-medium text-sm ${
                            user.isCurrentUser ? "text-checkmate-primary" : ""
                          }`}
                        >
                          {user.name} {user.isCurrentUser ? "(You)" : ""}
                        </span>
                        <span className="text-xs text-gray-500">
                          {user.points} pts
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                        <span>{user.votes} votes</span>
                        <span>{user.accuracy}% accuracy</span>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1">
                        {user.badges.map((badge, index) => (
                          <Badge
                            key={index}
                            className={`text-xs px-2 py-0 ${getBadgeColor(
                              badge
                            )}`}
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No leaderboard data available yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              Start voting to see rankings!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Achievement Info */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="text-checkmate-primary" size={16} />
            <span className="font-medium text-sm">
              How to Climb the Leaderboard
            </span>
          </div>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Vote on more messages (+10 pts each)</li>
            <li>• Maintain high accuracy (+5 pts bonus at 80%+)</li>
            <li>• Submit quality messages (+20 pts each)</li>
            <li>• Achieve voting streaks (+50 pts weekly)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
