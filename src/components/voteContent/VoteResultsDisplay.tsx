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
  communityNoteCategory: "great" | "acceptable" | "unacceptable" | null;
}

export default function VoteResultsDisplay(Props: VoteResultsDisplayProps) {
  const { data: pollStats, isLoading, error } = useGetPollResultsById(Props.pollId);

  // TODO: Create a loading component for all the pages
  if (isLoading) {
    return <>Loading...</>;
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
      <VoteNoteChart assessedInfo={pollStats} communityNoteCategory={Props.communityNoteCategory} />
    </>
  );
}
