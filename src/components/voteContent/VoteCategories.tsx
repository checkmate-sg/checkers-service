"use client";

import { MegaphoneIcon, NewspaperIcon, XCircleIcon } from 'lucide-react';
import { useState } from 'react';

import {
  EllipsisHorizontalCircleIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  QuestionMarkCircleIcon,
  ShieldExclamationIcon
} from '@heroicons/react/20/solid';

import TooltipWithHelperIcon from '../common/TooltipwithHelperIcon';
import { Button } from '../ui/button';
import InfoOptions from './InfoOptions';
import NvcOptions from './NvcOptions';

interface VotingCategoriesProps {
  category: string | null;
  truthScore: number | null;
  onNextStep: (value: number) => void;
  onVoteCategorySelection: (value: string) => void;
  onTruthScoreChange: (value: number | null) => void;
  disabled: boolean;
  hasCommunityNote: boolean;
}

const CATEGORIES = [
  {
    name: "scam",
    icon: <XCircleIcon className="h-7 w-7" />,
    display: "Scam",
    description: "Intended to obtain money/personal information via deception",
  },
  {
    name: "illicit",
    icon: <ShieldExclamationIcon className="h-7 w-7" />,
    display: "Illicit",
    description: "Other potential illicit activity, e.g. moneylending/prostitution",
  },
  {
    name: "info",
    icon: <NewspaperIcon className="h-7 w-7" />,
    display: "News/Info/Opinion",
    description: "Content intended to inform/convince/mislead a broad base of people",
  },
  {
    name: "satire",
    icon: <FaceSmileIcon className="h-7 w-7" />,
    display: "Satire",
    description: "Content clearly satirical in nature",
  },
  {
    name: "spam",
    icon: <MegaphoneIcon className="h-7 w-7" />,
    display: "Marketing/Spam",
    description:
      "Content intended to (i) promote or publicise a non-malicious product, service or event or (ii) convince recipient to spread non-malicious messages to others",
  },
  {
    name: "nvc",
    icon: <EllipsisHorizontalCircleIcon className="h-7 w-7" />,
    display: "No Verifiable Content",
    description:
      "Content that isn't capable of being checked using publicly-available information due to its nature",
  },
  {
    name: "unsure",
    icon: <QuestionMarkCircleIcon className="h-7 w-7" />,
    display: "Unsure",
    description:
      "Either (i) Needs more information from sender to assess, or (ii) a search of publicly available information yields no useful results",
  },
  {
    name: "pass",
    icon: <PaperAirplaneIcon className="h-7 w-7" />,
    display: "Pass",
    description: "Skip this message if you're really unable to assess it",
  },
];

function getSelectedCategory(category: string | null) {
  switch (category) {
    case "irrelevant":
      return "nvc";
    case "legitimate":
      return "nvc";
    default:
      return category;
  }
}

export default function VoteCategories(props: VotingCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    getSelectedCategory(props.category)
  );
  const [truthScore, setTruthScore] = useState<number | null>(props.truthScore);

  const [NVCCategory, setNVCCategory] = useState<string | null>(null);

  const handleSelection = (value: string) => {

    setSelectedCategory(value);
    switch (value) {
      case "nvc":
        props.onVoteCategorySelection("nvc");
        break;
      case "info":
        props.onVoteCategorySelection(value);
        // Don't move to next step yet - wait for truth score selection
        break;
      default:
        props.onVoteCategorySelection(value);
        if (props.hasCommunityNote===true) {
          props.onNextStep(2);
        }
        break;
    }
  };

  const handleNVCSelection = (value: string) => {

    setNVCCategory(value);
    props.onVoteCategorySelection(value);
    if (props.hasCommunityNote===true) {
      props.onNextStep(2);
    }
  };

  const handleTruthScoreChange = (value: string) => {
    setTruthScore(parseInt(value));
    props.onTruthScoreChange(parseInt(value));
    if (props.hasCommunityNote===true) {
      props.onNextStep(2);
    }
  };

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

          {/* Conditionally render InfoOptions right after the "info" button if it has been selected */}
          {selectedCategory === "info" && cat.name === "info" && (
            <InfoOptions
              selectedTruthScore={truthScore}
              numberPointScale={6}
              handleTruthScoreChange={handleTruthScoreChange}
            />
          )}
          {selectedCategory === "nvc" && cat.name === "nvc" && (
            <NvcOptions selectedNVCCategory={NVCCategory} onChange={handleNVCSelection} />
          )}
        </div>
      ))}
    </div>
  );
}
