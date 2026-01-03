"use client";

import { AlertCircle, Loader2 } from 'lucide-react';

import { useGetCheckersById } from '@/hooks/checkers/useGetCheckersDetails';
import { useGetCheckersProgrammeById } from '@/hooks/checkers/useGetCheckersProgramme';

import { ProgressItem } from '../common/progress-item/ProgressItem';

interface CheckersDashboardProps {
  checkerId: string;
}

export const CheckersDashboard = ({ checkerId }: CheckersDashboardProps) => {
  const isProd = process.env.NODE_ENV === "production";

  const { data: checker, isLoading: checkerLoading, error: checkerError } = useGetCheckersById(checkerId);

  const { data: programme, isLoading: programmeLoading, error: programmeError} = useGetCheckersProgrammeById(checkerId);

  if (checkerLoading || programmeLoading)
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
    
    if (checkerError || programmeError) {
      return (
        <div className="p-4 max-w-md mx-auto flex flex-col items-center justify-center min-h-[200px] gap-3">
          <AlertCircle className="text-red-500" size={32} />
          <p className="text-red-600 text-center font-medium">
            Something went wrong loading your dashboard.
          </p>
          <p className="text-gray-500 text-sm text-center">
            {checkerError?.message || programmeError?.message || "Please try again later."}
          </p>
        </div>
      );
    }

  return (
    <div className="flex flex-col gap-y-4 p-4">
      <h6 className="text-orange-600 text-lg font-semibold">
        Hello, {checker.name}! Up for a challenge? Attain these 3 milestones to finish the CheckMate
        Checker's Program and get certified.
      </h6>
      <ProgressItem
        name="Messages Voted On"
        imgSrc="/votes.png"
        currentNum={programme.progress.votes.current}
        targetNum={programme.progress.votes.target}
        isPercentageTarget={false}
        tooltipHeader="Messages Voted On"
        tooltipDescription={`Number of messages that you have voted on (passing does not count). You need to vote on at least 20 messages.`}
      />

      <ProgressItem
        name="Voting Accuracy"
        imgSrc="/accuracy.png"
        currentNum={programme.progress.accuracy.current ?? 0}
        targetNum={programme.progress.accuracy.target}
        isPercentageTarget={true}
        tooltipHeader="Voting Accuracy (%)"
        tooltipDescription={`% of your votes that match the majority vote. You need to obtain at least 60%
              }% accuracy. Messages where the majority category does not receive 50% of the votes are excluded from this calculation.`}
      />

      <ProgressItem
        name="Messages Reported"
        imgSrc="/message.png"
        currentNum={programme.progress.reports.current}
        targetNum={programme.progress.reports.target}
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
