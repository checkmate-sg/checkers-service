import { Checker, ProgrammeProgressResponse } from "@/lib/request/external/lib/data-contracts";

import { ProgressItem } from "../common/progress-item/ProgressItem";
import { useUpdateDailyVoteLimit } from "@/hooks/checkers/useUpdateDailyVoteLimit";
import EditableStatCard from "./EditableStatCard";

interface ProgrammeDashboardProps {
  checker: Checker;
  programme: ProgrammeProgressResponse;
}

export const ProgrammeDashboard = ({ checker, programme }: ProgrammeDashboardProps) => {
  const isProd = process.env.NODE_ENV === "production";
  const updateDailyLimit = useUpdateDailyVoteLimit(checker._id);

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
            . You need to submit at least {programme.progress.reports.target} messages that are not
            eventually marked nvc-can't tell.
          </>
        }
      />
      <EditableStatCard
        name="max daily votes"
        imgSrc="/votes.png"
        initialValue={String(checker.maxDailyVotes)}
        onSave={async v => {
          await updateDailyLimit.mutateAsync(Number(v));
        }}
      ></EditableStatCard>
    </div>
  );
};
