
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Star } from "lucide-react";

const Leaderboard = () => {
  // TODO: Replace with actual leaderboard data from backend
  const leaderboardData = [
    {
      rank: 1,
      name: "Sarah Chen",
      votes: 324,
      accuracy: 94,
      badges: ["Top Voter", "Accuracy Expert", "Week Streak"],
      points: 2850
    },
    {
      rank: 2, 
      name: "Alex Kumar",
      votes: 298,
      accuracy: 91,
      badges: ["Consistent Checker", "Fast Responder"],
      points: 2720
    },
    {
      rank: 3,
      name: "Maya Patel", 
      votes: 287,
      accuracy: 89,
      badges: ["Team Player", "Quality Voter"],
      points: 2580
    },
    {
      rank: 4,
      name: "David Wong",
      votes: 245,
      accuracy: 87,
      badges: ["Rising Star"],
      points: 2290
    },
    {
      rank: 5,
      name: "Lisa Garcia",
      votes: 234,
      accuracy: 85,
      badges: ["Dedicated Checker"],
      points: 2150
    },
    {
      rank: 6,
      name: "Tom Johnson",
      votes: 198,
      accuracy: 83,
      badges: ["New Talent"],
      points: 1890
    },
    {
      rank: 7,
      name: "You",
      votes: 23,
      accuracy: 75,
      badges: ["Getting Started"],
      points: 185,
      isCurrentUser: true
    }
  ];

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
      "Getting Started": "bg-gray-500 text-white"
    };
    return colors[badge] || "bg-gray-500 text-white";
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-checkmate-text mb-2">Leaderboard</h1>
        <p className="text-gray-600 text-sm">Top CheckMate contributors</p>
      </div>

      {/* Top 3 Podium */}
      <Card className="mb-6 bg-gradient-to-br from-checkmate-secondary to-white">
        <CardContent className="p-6">
          <div className="flex justify-center items-end gap-4">
            {/* 2nd Place */}
            <div className="text-center">
              <Avatar className="mx-auto mb-2 w-12 h-12">
                <AvatarFallback className="bg-gray-400 text-white">AK</AvatarFallback>
              </Avatar>
              <div className="bg-gray-400 text-white px-2 py-4 rounded-lg">
                <div className="text-xs font-bold">2nd</div>
                <div className="text-xs">{leaderboardData[1].votes} votes</div>
                <div className="text-xs">{leaderboardData[1].accuracy}%</div>
              </div>
              <p className="text-xs mt-1 font-medium">{leaderboardData[1].name}</p>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <Avatar className="mx-auto mb-2 w-16 h-16">
                <AvatarFallback className="bg-checkmate-primary text-white">SC</AvatarFallback>
              </Avatar>
              <div className="bg-checkmate-primary text-white px-3 py-6 rounded-lg">
                <Trophy className="mx-auto mb-1" size={16} />
                <div className="text-xs font-bold">1st</div>
                <div className="text-xs">{leaderboardData[0].votes} votes</div>
                <div className="text-xs">{leaderboardData[0].accuracy}%</div>
              </div>
              <p className="text-xs mt-1 font-medium">{leaderboardData[0].name}</p>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <Avatar className="mx-auto mb-2 w-12 h-12">
                <AvatarFallback className="bg-amber-600 text-white">MP</AvatarFallback>
              </Avatar>
              <div className="bg-amber-600 text-white px-2 py-4 rounded-lg">
                <div className="text-xs font-bold">3rd</div>
                <div className="text-xs">{leaderboardData[2].votes} votes</div>
                <div className="text-xs">{leaderboardData[2].accuracy}%</div>
              </div>
              <p className="text-xs mt-1 font-medium">{leaderboardData[2].name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Rankings */}
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
                  user.isCurrentUser ? "bg-checkmate-info" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {getRankIcon(user.rank)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={user.isCurrentUser ? "bg-checkmate-primary text-white" : ""}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-medium text-sm ${user.isCurrentUser ? "text-checkmate-primary" : ""}`}>
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500">{user.points} pts</span>
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
                          className={`text-xs px-2 py-0 ${getBadgeColor(badge)}`}
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

      {/* Achievement Info */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="text-checkmate-primary" size={16} />
            <span className="font-medium text-sm">How to Climb the Leaderboard</span>
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
