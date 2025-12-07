"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";

import { IconQuestionMark } from "@tabler/icons-react";

interface VoteMessageCardProps {
  voteId: string; // Vote ID
  externalId: string; // pollId, _id of polls collection (Common ID)
  text: string | null;
  imageUrl: string | null;
  startedTimestamp: string;
  crowdSourcedCategory?:
    | "scam"
    | "illicit"
    | "info"
    | "satire"
    | "spam"
    | "legitimate"
    | "irrelevant"
    | "unsure"
    | null;
  category?:
    | "scam"
    | "illicit"
    | "info"
    | "satire"
    | "spam"
    | "legitimate"
    | "irrelevant"
    | "unsure"
    | "pass"
    | null;
  truthScore: 0 | 1 | 2 | 3 | 4 | 5 | null;
  responseCategory: "great" | "acceptable" | "unacceptable" | null;
  commentOnResponse: string | null;
}

type ColourMap = {
  [key: string]: string;
};

const colours: ColourMap = {
  PENDING: "bg-yellow-400",
  CORRECT: "bg-emerald-400",
  INCORRECT: "bg-red-400",
  DEFAULT: "bg-orange-400",
  WAITING: "bg-blue-400",
};

export const VoteMessageCard = (props: VoteMessageCardProps) => {
  function renderStatusDot() {
    // Checking if the status is 'voted'
    if (props.category !== null && props.crowdSourcedCategory !== null) {
      // If Checker already vote
      if (props.crowdSourcedCategory === "unsure") {
        return (
          // Is unsure
          <div className="w-1/12 flex items-center justify-center">
            <IconQuestionMark className="border rounded-full border-black h-5 w-5" />
          </div>
        );
      } else {
        // Check if users is correct/wrong
        if (props.category === props.crowdSourcedCategory && props.crowdSourcedCategory !== null) {
          // Checker is correct
          return (
            <div className="w-1/12 flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full ${colours.CORRECT}`}></div>
            </div>
          );
        } else if (
          props.category !== props.crowdSourcedCategory &&
          props.crowdSourcedCategory !== null
        ) {
          // Checker is wrong
          return (
            <div className="w-1/12 flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full ${colours.INCORRECT}`}></div>
            </div>
          );
        }
      }
    } else {
      // Not assessed yet
      return (
        <div className="w-1/12 flex items-center justify-center">
          <PencilIcon className="h-5 w-5" />
        </div>
      );
    }

    // If none of the conditions match, return null
    return null;
  }

  return (
    <Link
      href={{
        pathname: `votes/${props.voteId}`,
      }}
    >
      <div className="flex border-b border-gray-500 h-16 hover-shadow">
        {renderStatusDot()}

        <div className="w-11/12 p-2">
          <p className="font-bold">23 sep 2025</p>
          <div className={`truncate inline-block overflow-hidden`}>
            {props.text ? props.text : "Image 🖼️"}
          </div>
        </div>
      </div>
    </Link>
  );
};
