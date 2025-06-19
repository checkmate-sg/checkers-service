"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Target,
  MessageSquare,
  Award,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardData {
  isNewChecker: boolean;
  userData: {
    name: string;
    votes: number;
    accuracy: number;
    messagesSent: number;
    lifetimeVotes: number;
    lifetimeAccuracy: number;
    engagementScore: number;
    recentActivity: Array<{
      message: string;
      date: string;
      type: string;
    }>;
  };
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">
              {error || "Failed to load dashboard"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { isNewChecker, userData } = dashboardData;

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-checkmate-text mb-2">
          Check<span className="text-checkmate-primary">Mate</span>
        </h1>
        <p className="text-gray-600">Fighting misinformation together</p>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {userData.name}!
        </p>
      </div>

      {isNewChecker ? (
        // New Checker Dashboard
        <div className="space-y-4">
          <Card className="border-checkmate-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="text-checkmate-primary" size={20} />
                Certification Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Votes Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Votes Completed</span>
                    <div className="group relative">
                      <svg
                        className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        This number tracks votes on completed submissions.
                        Results are finalized 24 hours after vote submission.
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">
                    {userData.votes}/50
                  </span>
                </div>
                <Progress value={(userData.votes / 50) * 100} className="h-2" />
              </div>

              {/* Accuracy Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Accuracy</span>
                  <span className="text-sm text-gray-600">
                    {userData.accuracy}%
                  </span>
                </div>
                <div className="relative">
                  <Progress value={userData.accuracy} className="h-2" />
                  {/* 60% target line - white bar */}
                  <div
                    className="absolute top-0 h-2 w-0.5 bg-white border border-checkmate-primary"
                    style={{ left: "60%" }}
                  />
                </div>
                {/* 60% label below the bar */}
                <div className="relative mt-1">
                  <div
                    className="absolute text-xs text-checkmate-primary font-medium"
                    style={{ left: "60%", transform: "translateX(-50%)" }}
                  >
                    60%
                  </div>
                </div>
                {userData.accuracy >= 60 && (
                  <Badge className="mt-4 bg-green-100 text-green-800">
                    Target Reached!
                  </Badge>
                )}
              </div>

              {/* Messages Sent */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Messages Sent</span>
                  <span className="text-sm text-gray-600">
                    {userData.messagesSent}/3
                  </span>
                </div>
                <Progress
                  value={(userData.messagesSent / 3) * 100}
                  className="h-2"
                />
              </div>

              {/* Certification Status */}
              <div className="bg-checkmate-info p-3 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-blue-600" size={16} />
                  <span className="font-medium text-sm">
                    Certification Status
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {userData.votes >= 50 &&
                  userData.accuracy >= 60 &&
                  userData.messagesSent >= 3
                    ? "🎉 Eligible for certification! Contact admin to complete."
                    : "Complete all requirements above to become a certified checker."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity for New Checkers */}
          {userData.recentActivity.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare size={20} />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {userData.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-500">{activity.date}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          activity.type === "achievement"
                            ? "border-checkmate-primary text-checkmate-primary"
                            : ""
                        }`}
                      >
                        {activity.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Certified Checker Dashboard
        <div className="space-y-4">
          <Card className="border-checkmate-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="text-checkmate-primary" size={20} />
                Certified Checker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-checkmate-primary">
                    {userData.lifetimeVotes}
                  </div>
                  <div className="text-xs text-gray-600">Total Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-checkmate-primary">
                    {userData.lifetimeAccuracy}%
                  </div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-checkmate-primary">
                    {userData.engagementScore}
                  </div>
                  <div className="text-xs text-gray-600">Engagement</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare size={20} />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        activity.type === "achievement"
                          ? "border-checkmate-primary text-checkmate-primary"
                          : ""
                      }`}
                    >
                      {activity.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
