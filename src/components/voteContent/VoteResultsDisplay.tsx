import { Loader2 } from "lucide-react";

import { useGetPollResultsById } from "@/hooks/polls/useGetPollResults";

import VoteChart from "./VoteChart";
import VoteNoteChart from "./VoteNoteChart";
import VoteResult from "./VoteResult";

interface VoteResultsDisplayProps {
  pollId: string | null;
  voteCategory: string | null;
  voteTruthScore: number | null;
  pollCategory: string | null;
  pollTruthScore: number | null;
  communityNoteCategory?: "great" | "acceptable" | "unacceptable" | null;
  hasCommunityNote: boolean;
}

export default function VoteResultsDisplay(Props: VoteResultsDisplayProps) {
  const { data: pollStats, isLoading, error } = useGetPollResultsById(Props.pollId);
  console.log(pollStats);

  if (isLoading) {
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full gap-x-2">
        <div className="flex flex-1 flex-col justify-center">
          <h5 className="text-center text-lg font-semibold text-primary">Your Vote</h5>
          <VoteResult category={Props.voteCategory} truthScore={Props.voteTruthScore} />
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <h5 className="text-center text-lg font-semibold text-primary">Final Result</h5>
          <VoteResult category={Props.pollCategory} truthScore={Props.pollTruthScore} />
        </div>
      </div>
      <VoteChart assessedInfo={pollStats} />
      {Props.hasCommunityNote ? (
        <VoteNoteChart
          assessedInfo={pollStats}
          communityNoteCategory={Props.communityNoteCategory}
        />
      ) : null}
    </>
  );
}
