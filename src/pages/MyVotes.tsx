
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const MyVotes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // TODO: Replace with actual data from backend
  const messagesData = [
    {
      id: "msg_001",
      content: "🚨 URGENT: New COVID variant spreads through 5G towers! Share this...",
      category: "False",
      status: "voted",
      myVote: "False",
      aiRating: "great",
      timestamp: "2024-01-15 14:30",
      finalResult: "False - 85% consensus"
    },
    {
      id: "msg_002", 
      content: "Government announces new tax relief for families earning under...",
      category: "Pending",
      status: "pending",
      myVote: "Legitimate",
      aiRating: "acceptable",
      timestamp: "2024-01-14 09:15",
      finalResult: null
    },
    {
      id: "msg_003",
      content: "BREAKING: Celebrity caught in scandal, photos leaked...",
      category: "Misleading",
      status: "voted", 
      myVote: "Misleading",
      aiRating: "great",
      timestamp: "2024-01-13 16:45",
      finalResult: "Misleading - 72% consensus"
    },
    {
      id: "msg_004",
      content: "Free iPhone giveaway! Click here to claim yours now...",
      category: "Pending",
      status: "pending",
      myVote: "Scam", 
      aiRating: "acceptable",
      timestamp: "2024-01-12 11:20",
      finalResult: null
    }
  ];

  const filteredMessages = messagesData.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || 
      (activeTab === "pending" && message.status === "pending") ||
      (activeTab === "voted" && message.status === "voted");
    
    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string, finalResult: string | null) => {
    if (status === "pending") {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-300"><Clock size={12} className="mr-1" />Pending</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle size={12} className="mr-1" />Voted</Badge>;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "False": "bg-red-100 text-red-800",
      "Misleading": "bg-orange-100 text-orange-800", 
      "Scam": "bg-red-100 text-red-800",
      "Legitimate": "bg-green-100 text-green-800",
      "Pending": "bg-gray-100 text-gray-800"
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-checkmate-text mb-2">My Votes</h1>
        <p className="text-gray-600 text-sm">Track your verification history</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
        <Input
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="voted">Voted</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No messages found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((message) => (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Status and Category */}
                  <div className="flex justify-between items-start">
                    {getStatusBadge(message.status, message.finalResult)}
                    <Badge className={getCategoryColor(message.myVote)}>
                      {message.myVote}
                    </Badge>
                  </div>

                  {/* Message Content */}
                  <p className="text-sm text-gray-800 line-clamp-2">
                    {message.content}
                  </p>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500">{message.timestamp}</p>

                  {/* Final Result (if voted) */}
                  {message.finalResult && (
                    <div className="bg-checkmate-info p-2 rounded text-xs">
                      <strong>Final Result:</strong> {message.finalResult}
                    </div>
                  )}

                  {/* AI Rating */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">AI Note: {message.aiRating}</span>
                    <Link to={`/vote/${message.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 text-sm">Your Voting Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-checkmate-primary">
                {messagesData.filter(m => m.status === "voted").length}
              </div>
              <div className="text-xs text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-600">
                {messagesData.filter(m => m.status === "pending").length}
              </div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyVotes;
