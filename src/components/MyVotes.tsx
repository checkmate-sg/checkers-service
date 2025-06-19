"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock, CheckCircle } from "lucide-react";

const MyVotes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [messagesData, setMessagesData] = useState([]);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const res = await fetch("/api/votes");
        const data = await res.json();
        console.log(data);
        setMessagesData(data);
      } catch (err) {
        console.error("Error fetching votes:", err);
      }
    };

    fetchVotes();
  }, []);

  const filteredMessages = messagesData.filter((message) => {
    const matchesSearch = message.content
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "pending" && message.status === "pending") ||
      (activeTab === "voted" && message.status === "voted");

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string, finalResult: string | null) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-300"
          >
            <Clock size={12} className="mr-1" />
            Pending
          </Badge>
        );
      case "voted":
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <CheckCircle size={12} className="mr-1" />
            Voted
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            <CheckCircle size={12} className="mr-1" />
            Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-300">
            {status}
          </Badge>
        );
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      False: "bg-red-100 text-red-800",
      Misleading: "bg-orange-100 text-orange-800",
      Scam: "bg-red-100 text-red-800",
      Legitimate: "bg-green-100 text-green-800",
      Pending: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-checkmate-text mb-2">
          My Votes
        </h1>
        <p className="text-gray-600 text-sm">Track your verification history</p>
      </div>
      {/* Search */}
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={16}
        />
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
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredMessages.map((vote) => (
            <Card key={vote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Status and Category */}
                  <div className="flex justify-between items-start">
                    {getStatusBadge(vote.status, vote.finalResult)}
                    <Badge className={getCategoryColor(vote.myVote)}>
                      {vote.myVote}
                    </Badge>
                  </div>

                  {/* Message Content */}
                  <p className="text-sm text-gray-800 line-clamp-2">
                    {vote.content}
                  </p>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500">{vote.timestamp}</p>

                  {/* Final Result (if voted) */}
                  {vote.finalResult && (
                    <div className="bg-checkmate-info p-2 rounded text-xs">
                      <strong>Final Result:</strong> {vote.finalResult}
                    </div>
                  )}

                  {/* AI Rating */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      AI Note: {vote.aiNote}
                    </span>
                    <Link href={`/vote/${vote.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
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
                {messagesData.filter((m) => m.status === "voted").length}
              </div>
              <div className="text-xs text-gray-600">Voted</div>
            </div>
            <div>
              <div className="text-xl font-bold text-yellow-600">
                {messagesData.filter((m) => m.status === "pending").length}
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
