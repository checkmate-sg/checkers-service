"use client";

import { Loader2 } from "lucide-react";

import { useGetCheckersById } from "@/hooks/checkers/useGetCheckersDetails";

import { ProgressItem } from "../common/progress-item/ProgressItem";

interface CheckersDashboardProps {
  checkerId: string;
}

export const CheckersDashboard = ({ checkerId }: CheckersDashboardProps) => {
  const isProd = process.env.NODE_ENV === "production";

  // TODO: Add numReported using API from WhatsApp Service
  const numReported = 3;

  // TODO: Voting Accuracy
  const votingAccuracy = 70;

  // TODO: Set the numVotesTarget, numReportTarget, and numAccuracyTarget dynamically

  const { data: checker, isLoading, error } = useGetCheckersById(checkerId);

  if (isLoading)
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <h6 className="text-orange-600 text-lg font-semibold">
        Hello, {checker.name}! Up for a challenge? Attain these 3 milestones to finish the CheckMate
        Checker's Program and get certified.
      </h6>
      <ProgressItem
        name="Messages Voted On"
        imgSrc="/votes.png"
        currentNum={checker.numVoted}
        targetNum={50}
        isPercentageTarget={false}
        tooltipHeader="Messages Voted On"
        tooltipDescription={`Number of messages that you have voted on (passing does not count). You need to vote on at least 20 messages.`}
      />

      <ProgressItem
        name="Voting Accuracy"
        imgSrc="/accuracy.png"
        currentNum={votingAccuracy}
        targetNum={60}
        isPercentageTarget={true}
        tooltipHeader="Voting Accuracy (%)"
        tooltipDescription={`% of your votes that match the majority vote. You need to obtain at least 60%
              }% accuracy. Messages where the majority category does not receive 50% of the votes are excluded from this calculation.`}
      />

      <ProgressItem
        name="Messages Reported"
        imgSrc="/message.png"
        currentNum={numReported}
        targetNum={10}
        isPercentageTarget={false}
        tooltipHeader="Messages Reported"
        tooltipDescription={
          <>
            Number of messages that you have submitted to our{" "}
            <a
              href={
                isProd
                  ? "https://wa.me/6580432188" // TODO: To check if this is still the same
                  : "https://wa.me/6586177848"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              WhatsApp Bot
            </a>
            . You need to submit at least 10 messages that are not eventually marked nvc-can't tell.
          </>
        }
      />
    </div>
  );
};
