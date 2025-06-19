"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Meh,
  CheckCircle,
  Clock,
  MessageSquare,
  Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryTooltip from "@/components/CategoryTooltip";

const VotePage = () => {
  const params = useParams();
  const voteId = params.voteid;
  const router = useRouter();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiRating, setAiRating] = useState("");
  const [comment, setComment] = useState("");
  const [messageData, setMessageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [isVoteCompleted, setIsVoteCompleted] = useState(false);
  const [userPreviousVote, setUserPreviousVote] = useState(null);

  // Hardcoded checker ID
  const checkerId = "665eaaaa0000000000000001";

  // Fetch vote data from MongoDB
  useEffect(() => {
    const fetchVoteData = async () => {
      console.log("this is voteID,", voteId);
      if (!voteId) {
        setError("No vote ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/votes/${voteId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch vote: ${response.status}`);
        }

        const data = await response.json();
        setMessageData(data);

        // Check if vote is completed
        if (data.status === "completed") {
          setIsVoteCompleted(true);
        }

        // Check if current user has already voted
        const userVote = data.votes?.find(
          (vote) => vote.checkerId === checkerId
        );

        if (userVote) {
          setHasUserVoted(true);
          setUserPreviousVote(userVote);

          // Pre-populate form with user's previous selections
          console.log("Previous user vote:", userVote); // Debug log

          // Set category (handle both 'vote' and 'category' fields)
          const category = userVote.vote || userVote.category;
          if (category) {
            setSelectedCategory(category);
          }

          // Set tags (ensure it's an array)
          if (userVote.tags && Array.isArray(userVote.tags)) {
            setSelectedTags([...userVote.tags]); // Create a new array to trigger re-render
          } else if (userVote.tags && typeof userVote.tags === "string") {
            // Handle case where tags might be stored as a string
            try {
              const parsedTags = JSON.parse(userVote.tags);
              if (Array.isArray(parsedTags)) {
                setSelectedTags([...parsedTags]);
              }
            } catch (e) {
              console.warn("Could not parse tags:", userVote.tags);
              setSelectedTags([]);
            }
          } else {
            setSelectedTags([]);
          }

          // Set AI rating
          if (userVote.aiRating) {
            setAiRating(userVote.aiRating);
          }

          // Set comment (handle both 'comment' and 'comments' fields)
          const userComment = userVote.comment;
          if (userComment) {
            setComment(userComment);
          }
        }
      } catch (err) {
        console.error("Error fetching vote data:", err);
        setError(err.message || "Failed to load vote data");
        toast({
          title: "Error",
          description: "Failed to load vote data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVoteData();
  }, [voteId, toast]);

  const categories = [
    "Scam",
    "Satire",
    "Illicit",
    "Misleading",
    "False",
    "Spam",
    "Legitimate",
  ];

  const availableTags = [
    "Health",
    "Politics",
    "Finance",
    "Technology",
    "Urgent",
    "Chain Message",
    "Verified",
    "Suspicious",
    "News",
    "Medical",
    "Investment",
    "Scam",
    "Tutorial",
    "Analysis",
  ];

  const handleTagToggle = (tag: string) => {
    if (isVoteCompleted) return; // Don't allow changes if vote is completed

    setSelectedTags((prev) => {
      const newTags = prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag];

      console.log("Updated tags:", newTags); // Debug log
      return newTags;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast({
        title: "Category Required",
        description: "Please select a message category before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!aiRating) {
      toast({
        title: "AI Rating Required",
        description: "Please rate the AI community note.",
        variant: "destructive",
      });
      return;
    }

    try {
      const submitData = {
        category: selectedCategory,
        tags: selectedTags,
        aiRating,
        comment: comment.trim(), // Trim whitespace
        checkerId,
      };

      console.log("Submitting vote data:", submitData); // Debug log

      const response = await fetch(`/api/votes/${voteId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit vote");
      }

      toast({
        title: hasUserVoted ? "Vote Updated!" : "Vote Submitted!",
        description: "Thank you for helping fight misinformation.",
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Error submitting vote:", err);
      toast({
        title: "Error",
        description: "Failed to submit vote. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case "great":
        return <ThumbsUp size={16} className="text-green-600" />;
      case "acceptable":
        return <Meh size={16} className="text-yellow-600" />;
      case "unacceptable":
        return <ThumbsDown size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case "great":
        return "bg-green-100 text-green-800";
      case "acceptable":
        return "bg-yellow-100 text-yellow-800";
      case "unacceptable":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-checkmate-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vote data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !messageData) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Review Message</h1>
        </div>
        <Card className="border-red-200">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error || "Vote not found"}</p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-bold">Review Message</h1>
          {/* Status indicator */}
          <div className="ml-auto">
            {isVoteCompleted ? (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                <CheckCircle size={12} className="mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                <Clock size={12} className="mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Message Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suspicious Message</CardTitle>
            <p className="text-xs text-gray-500">
              Received: {messageData.timestamp || "Unknown"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">{messageData.content}</p>
            </div>

            {/* Screenshot preview */}
            {messageData.screenshot && (
              <div>
                <p className="text-sm font-medium mb-2">Screenshot Preview:</p>
                <img
                  src={messageData.screenshot}
                  alt="Message screenshot"
                  className="w-full h-32 object-cover rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Community Note */}
        {messageData.aiNote && (
          <Card className="border-checkmate-info">
            <CardHeader className="pb-3 bg-checkmate-info rounded-t-lg">
              <CardTitle className="text-base">AI Community Note</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm mb-3">{messageData.aiNote.summary}</p>
              {messageData.aiNote.references &&
                messageData.aiNote.references.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">References:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {messageData.aiNote.references.map((ref, index) => (
                        <li key={index}>• {ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Show final result if vote is completed */}
        {isVoteCompleted && messageData.finalResult && (
          <Card className="border-blue-200">
            <CardHeader className="pb-3 bg-blue-50 rounded-t-lg">
              <CardTitle className="text-base text-blue-800">
                Final Result
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm font-medium text-blue-800">
                {messageData.finalResult}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Only show voting form if vote is not completed */}
        {!isVoteCompleted && (
          <>
            {/* Category Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Message Category *
                  {hasUserVoted && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      (Update your selection)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <div
                        key={category}
                        className="flex items-center space-x-2"
                      >
                        <RadioGroupItem value={category} id={category} />
                        <Label
                          htmlFor={category}
                          className="text-sm flex items-center"
                        >
                          {category}
                          <CategoryTooltip category={category} />
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags (Optional)</CardTitle>
                <p className="text-xs text-gray-500">
                  Select relevant tags to categorize this message
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={
                        selectedTags.includes(tag) ? "default" : "outline"
                      }
                      className={`cursor-pointer ${
                        selectedTags.includes(tag)
                          ? "bg-checkmate-primary text-white"
                          : "hover:bg-checkmate-primary hover:text-white"
                      }`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className="mt-3 text-xs text-gray-600">
                    Selected: {selectedTags.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Note Rating */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rate AI Note *</CardTitle>
                <p className="text-xs text-gray-500">
                  How helpful was the AI community note?
                </p>
              </CardHeader>
              <CardContent>
                <RadioGroup value={aiRating} onValueChange={setAiRating}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="great" id="great" />
                      <Label
                        htmlFor="great"
                        className="flex items-center gap-2"
                      >
                        <ThumbsUp size={16} className="text-green-600" />
                        Great
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="acceptable" id="acceptable" />
                      <Label
                        htmlFor="acceptable"
                        className="flex items-center gap-2"
                      >
                        <Meh size={16} className="text-yellow-600" />
                        Acceptable
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="unacceptable" id="unacceptable" />
                      <Label
                        htmlFor="unacceptable"
                        className="flex items-center gap-2"
                      >
                        <ThumbsDown size={16} className="text-red-600" />
                        Unacceptable
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Optional Comment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Additional Comment (Optional)
                </CardTitle>
                <p className="text-xs text-gray-500">
                  Share your reasoning or additional observations
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any additional context or observations..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px]"
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {comment.length}/500 characters
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full bg-checkmate-primary hover:bg-checkmate-primary/90 text-white py-3 text-base font-medium rounded-lg"
            >
              {hasUserVoted ? "Update Vote" : "Submit Vote"}
            </Button>
          </>
        )}

        {/* Show read-only message if vote is completed */}
        {isVoteCompleted && (
          <Card className="border-gray-200">
            <CardContent className="p-6 text-center">
              <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Voting Completed</h3>
              <p className="text-gray-600 mb-4">
                This message has been reviewed and the voting period has ended.
              </p>
              {hasUserVoted && (
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    Your vote:{" "}
                    <span className="font-medium">{selectedCategory}</span>
                  </p>
                  {userPreviousVote?.aiRating && (
                    <p>
                      AI Rating:{" "}
                      <span className="font-medium capitalize">
                        {userPreviousVote.aiRating}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default VotePage;
