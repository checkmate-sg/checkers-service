
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Target, MessageSquare, Award } from "lucide-react";

const Dashboard = () => {
  // TODO: Replace with actual user data from backend
  const isNewChecker = true; // Change to false for certified checkers
  const userData = {
    votes: 23,
    accuracy: 75,
    messagesSent: 1,
    lifetimeVotes: 150,
    lifetimeAccuracy: 82,
    engagementScore: 95,
    recentActivity: [
      { message: "Verified health claim", date: "2 hours ago", type: "vote" },
      { message: "Submitted suspicious message", date: "1 day ago", type: "submission" },
      { message: "Achieved 70% accuracy milestone", date: "3 days ago", type: "achievement" }
    ]
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-checkmate-text mb-2">
          Check<span className="text-checkmate-primary">Mate</span>
        </h1>
        <p className="text-gray-600">Fighting misinformation together</p>
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
                  <span className="text-sm font-medium">Votes</span>
                  <span className="text-sm text-gray-600">{userData.votes}/50</span>
                </div>
                <Progress value={(userData.votes / 50) * 100} className="h-2" />
              </div>

              {/* Accuracy Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Accuracy</span>
                  <span className="text-sm text-gray-600">{userData.accuracy}%</span>
                </div>
                <div className="relative">
                  <Progress 
                    value={userData.accuracy} 
                    className="h-2"
                  />
                  {/* 60% target line */}
                  <div 
                    className="absolute top-0 h-2 w-0.5 bg-checkmate-primary" 
                    style={{ left: '60%' }}
                  />
                  <div 
                    className="absolute -top-1 text-xs text-checkmate-primary font-medium" 
                    style={{ left: '60%', transform: 'translateX(-50%)' }}
                  >
                    60%
                  </div>
                </div>
                {userData.accuracy >= 60 && (
                  <Badge className="mt-2 bg-green-100 text-green-800">Target Reached!</Badge>
                )}
              </div>

              {/* Messages Sent */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Messages Sent</span>
                  <span className="text-sm text-gray-600">{userData.messagesSent}/3</span>
                </div>
                <Progress value={(userData.messagesSent / 3) * 100} className="h-2" />
              </div>

              {/* Certification Status */}
              <div className="bg-checkmate-info p-3 rounded-lg mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-blue-600" size={16} />
                  <span className="font-medium text-sm">Certification Status</span>
                </div>
                <p className="text-xs text-gray-600">
                  {userData.votes >= 50 && userData.accuracy >= 60 && userData.messagesSent >= 3
                    ? "🎉 Eligible for certification! Contact admin to complete."
                    : "Complete all requirements above to become a certified checker."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
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
                  <div className="text-xl font-bold text-checkmate-primary">{userData.lifetimeVotes}</div>
                  <div className="text-xs text-gray-600">Total Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-checkmate-primary">{userData.lifetimeAccuracy}%</div>
                  <div className="text-xs text-gray-600">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-checkmate-primary">{userData.engagementScore}</div>
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
                        activity.type === 'achievement' ? 'border-checkmate-primary text-checkmate-primary' : ''
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
