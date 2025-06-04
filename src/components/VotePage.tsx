"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ArrowLeft, ThumbsUp, ThumbsDown, Meh } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CategoryTooltip from "@/components/CategoryTooltip";

const VotePage = () => {
  const { voteId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiRating, setAiRating] = useState("");
  const [comment, setComment] = useState("");

  // TODO: Replace with actual message data from backend based on voteId
  const messageData = {
    id: voteId,
    content:
      "🚨 URGENT: New COVID variant spreads through 5G towers! Share this with everyone you know to protect them! Government is hiding the truth! 📡🦠",
    timestamp: "2024-01-15 14:30",
    sender: "Unknown WhatsApp User",
    screenshot:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop", // Placeholder screenshot
    aiNote: {
      summary:
        "This message contains multiple false claims linking COVID-19 to 5G technology, which has been thoroughly debunked by health organizations worldwide. The message uses urgency tactics typical of misinformation campaigns.",
      references: [
        "WHO COVID-19 fact sheet",
        "FDA 5G safety guidelines",
        "Reuters fact-check article",
      ],
    },
  };

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
  ];

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
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

    // TODO: Submit vote data to backend
    console.log("Submitting vote:", {
      messageId: voteId,
      category: selectedCategory,
      tags: selectedTags,
      aiRating,
      comment,
    });

    toast({
      title: "Vote Submitted!",
      description: "Thank you for helping fight misinformation.",
    });

    router.push("/dashboard");
  };

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
        </div>

        {/* Message Content */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suspicious Message</CardTitle>
            <p className="text-xs text-gray-500">
              Received: {messageData.timestamp}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">{messageData.content}</p>
            </div>

            {/* Screenshot preview */}
            <div>
              <p className="text-sm font-medium mb-2">Screenshot Preview:</p>
              <img
                src={messageData.screenshot}
                alt="Message screenshot"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Community Note */}
        <Card className="border-checkmate-info">
          <CardHeader className="pb-3 bg-checkmate-info rounded-t-lg">
            <CardTitle className="text-base">AI Community Note</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-sm mb-3">{messageData.aiNote.summary}</p>
            <div>
              <p className="text-xs font-medium mb-1">References:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                {messageData.aiNote.references.map((ref, index) => (
                  <li key={index}>• {ref}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Category Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message Category *</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <div className="grid grid-cols-2 gap-3">
                {categories.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
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
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
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
          </CardContent>
        </Card>

        {/* AI Note Rating */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rate AI Note *</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={aiRating} onValueChange={setAiRating}>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="great" id="great" />
                  <Label htmlFor="great" className="flex items-center gap-2">
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
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add any additional context or observations..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          className="w-full bg-checkmate-primary hover:bg-checkmate-primary/90 text-white py-3 text-base font-medium rounded-lg"
        >
          Done
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default VotePage;
