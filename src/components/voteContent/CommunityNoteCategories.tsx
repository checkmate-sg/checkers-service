"use client";

import { useState } from 'react';

import { TrophyIcon } from '@heroicons/react/20/solid';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

import TooltipWithHelperIcon from '../common/TooltipwithHelperIcon';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

interface CommunityNoteCategoriesProps {
  crowdSourcedCategory: string | null;
  onCrowdSourcedCategorySelection: (value: string) => void;
  commentOnResponse: string | null;
  onCommentOnResponseChanged: (value: string) => void;
}

const CATEGORIES = [
  {
    name: "great",
    icon: <TrophyIcon className="h-7 w-7" />,
    display: "Great",
    description: "Helpful, informative, and concise reply. Nothing to nitpick.",
  },
  {
    name: "acceptable",
    icon: <CheckBadgeIcon className="h-7 w-7" />,
    display: "Acceptable",
    description: "Could be improved in style/substance, but contains no inaccuracy.",
  },
  {
    name: "unacceptable",
    icon: <XCircleIcon className="h-7 w-7" />,
    display: "Unacceptable",
    description: "Contains information, or conveys a message, that is outright wrong/untrue.",
  },
];

export default function CommunityNoteCategories(props: CommunityNoteCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    props.crowdSourcedCategory
  );

  const [commentOnResponse, setCommentOnResponse] = useState<string | null>(
    props.commentOnResponse
  );

  const handleSelection = (value: string) => {
    setSelectedCategory(value);
    props.onCrowdSourcedCategorySelection(value);
  };

  const handleCommentOnResponse = (value: string) => {
    setCommentOnResponse(value);
    props.onCommentOnResponseChanged(value);
  }

  return (
    <div className="grid grid-flow-row gap-y-4 items-center mb-4">
      {CATEGORIES.map((cat, index) => (
        <div key={index} className="w-full">
          <Button
            variant={selectedCategory === cat.name ? "voteCategories" : "default"}
            className="flex flex-row items-center justify-start gap-2 max-w-md space-x-3 text-sm w-full"
            key={index}
            onClick={() => handleSelection(cat.name)}
          >
            {cat.icon}
            {cat.display}
            <TooltipWithHelperIcon header={cat.display} text={cat.description} />
          </Button>
        </div>
      ))}

      <Textarea
        placeholder="[Optional] Comments, if any"
        value={commentOnResponse ?? ""}
        onChange={(e) => handleCommentOnResponse(e.target.value)}/>
    </div>
  );
}
