"use client";

import { PencilIcon } from "lucide-react";
import Link from "next/link";

import { IconQuestionMark } from "@tabler/icons-react";

interface VoteMessageCardProps {
  voteId: string; // Vote ID
  pollId: string; // pollId, _id of polls collection (Common ID)
  checkId: string; // checkId from CheckMate platform
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
  isCorrect: boolean | null;
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

function dateToDateString(date: Date | null): string {
  // Parse the ISO string into a Date object
  if (date === null) {
    return "No date";
  }
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  // Extract the day, month, and year from the Date object
  const day = date.getDate();
  const month = months[date.getUTCMonth()]; // Get month name from array
  const year = date.getFullYear();

  // Format the day and month to ensure they are in two digits, and get the last two digits of the year
  const formattedDay = day.toString().padStart(2, "0");
  const formattedYear = year.toString().substring(2);

  // Combine parts into the final DD-MM-YY format
  const formattedDate = `${formattedDay}-${month}-${formattedYear}`;

  // Return the formatted date
  return formattedDate;
}

export const VoteMessageCard = (props: VoteMessageCardProps) => {
  const dateString = dateToDateString(new Date(props.startedTimestamp));
  function renderStatusDot() {
    // Checking if the status is 'voted'
    if (
      props.category !== null &&
      props.crowdSourcedCategory !== null &&
      props.isCorrect !== null
    ) {
      // If Checker already vote
      if (props.crowdSourcedCategory === "unsure") {
        return (
          // Is unsure
          <div className="flex-shrink-0 w-12 flex items-center justify-center">
            <IconQuestionMark className="border rounded-full border-black h-5 w-5" />
          </div>
        );
      } else {
        // Check if users is correct/wrong
        if (props.isCorrect) {
          // Checker is correct
          return (
            <div className="flex-shrink-0 w-12 flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full ${colours.CORRECT}`}></div>
            </div>
          );
        } else if (
          props.category !== props.crowdSourcedCategory &&
          props.crowdSourcedCategory !== null
        ) {
          // Checker is wrong
          return (
            <div className="flex-shrink-0 w-12 flex items-center justify-center">
              <div className={`w-5 h-5 rounded-full ${colours.INCORRECT}`}></div>
            </div>
          );
        }
      }
    } else {
      // Not assessed yet
      return (
        <div className="flex-shrink-0 w-12 flex items-center justify-center">
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
      <div className="flex border-b border-gray-500 h-16 hover-shadow overflow-hidden max-w-full">
        {renderStatusDot()}

        <div className="flex-1 min-w-0 p-2 overflow-hidden flex flex-col justify-center">
          <p className="font-bold truncate">{dateString}</p>
          <div className="truncate text-sm">{props.text ? props.text : "Image 🖼️"}</div>
        </div>
      </div>
    </Link>
  );
};
