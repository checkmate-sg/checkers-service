"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock, CheckCircle, RefreshCw } from "lucide-react";

const MyVotes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [messagesData, setMessagesData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(Date.now());

  const fetchVotes = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await fetch("/api/votes", {
        cache: "no-store", // Ensure fresh data
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("[MyVotes] Fetched votes:", data.length, "items");
      setMessagesData(data);
      setLastFetch(Date.now());
    } catch (err) {
      console.error("Error fetching votes:", err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVotes();
  }, []);

  // Refetch when page becomes visible (user switches back to tab/app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("[MyVotes] Page became visible, refetching...");
        fetchVotes(false); // Don't show loading spinner for background refresh
      }
    };

    const handleFocus = () => {
      console.log("[MyVotes] Window focused, refetching...");
      fetchVotes(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Auto-refresh every 30 seconds when page is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        console.log("[MyVotes] Auto-refresh triggered");
        fetchVotes(false);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredMessages = messagesData.filter(message => {
    const matchesSearch = message.content.toLowerCase().includes(searchQuery.toLowerCase());
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
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
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

  const formatLastUpdate = () => {
    const now = Date.now();
    const diff = now - lastFetch;
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold text-checkmate-text">My Votes</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchVotes()}
            disabled={isLoading}
            className="p-2"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </Button>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-600 text-sm">Track your verification history</p>
          <p className="text-xs text-gray-400">Updated {formatLastUpdate()}</p>
        </div>
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
          onChange={e => setSearchQuery(e.target.value)}
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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Refreshing...</span>
        </div>
      )}

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
          filteredMessages.map(vote => (
            <Card key={vote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Status and Category */}
                  <div className="flex justify-between items-start">
                    {getStatusBadge(vote.status, vote.finalResult)}
                    <Badge className={getCategoryColor(vote.myVote)}>{vote.myVote}</Badge>
                  </div>

                  {/* Message Content */}
                  <p className="text-sm text-gray-800 line-clamp-2">{vote.content}</p>

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
                    <span className="text-gray-500">AI Note: {vote.aiNote}</span>
                    <Link href={`/vote/${vote.id}`}>
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
              <div className="text-xs text-gray-600">Voted</div>
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
