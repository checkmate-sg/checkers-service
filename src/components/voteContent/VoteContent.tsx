"use client";

import { Loader2 } from 'lucide-react';

import { useGetPollDetailsById } from '@/hooks/polls/useGetPollDetails';
import { useGetVotesById } from '@/hooks/votes/useGetVotesById';

import CommunityNoteCard from './CommunityNoteCard';
import MessageCard from './MessageCard';
import ReferenceLinksCard from './ReferenceLinksCard';
import VoteResultsDisplay from './VoteResultsDisplay';
import VotingSystem from './VotingSystem';

interface VoteContentProps {
  voteId: string;
}
export const VoteContent = ({ voteId }: VoteContentProps) => {
  const { data: vote, isLoading: isLoading_Vote, error: isError_Vote } = useGetVotesById(voteId);

  // Fetch the poll using pollId (which is the poll's _id)
  const {
    data: poll,
    isLoading: isLoading_Poll,
    error: isError_Poll,
  } = useGetPollDetailsById(vote?.pollId);

  if (isLoading_Poll || isLoading_Vote)
    return (
      <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  // console.log("Vote: ", vote);
  // console.log("poll:", poll);

  // handle error states
  if (isError_Poll) return <div>Failed to load poll</div>;

  // A/B test flag from vote data (fallback to false for existing votes without the field)
  const showNoteAfterVote = vote.showNoteAfterVote ?? false;

  return (
      <>
      <div className="grid grid-flow-row items-center gap-2 p-3">
        <MessageCard text={poll.text} caption={poll.caption} imageUrl={poll.imageURL} />

        {showNoteAfterVote && poll.shortformResponse.links && (
          <ReferenceLinksCard links={poll.shortformResponse.links} />
        )}

        {poll.shortformResponse.en && !showNoteAfterVote ? (
          <CommunityNoteCard
            responseEN={poll.shortformResponse.en}
            responseCN={poll.shortformResponse.cn}
            responseLinks={poll.shortformResponse.links}
          />
        ) : null}

        {vote.category === null || poll.crowdSourcedCategory === null ? (
          <VotingSystem
            voteRequestId={vote._id}
            category={vote.category}
            truthScore={vote.truthScore}
            responseCategory={vote.responseCategory}
            commentOnResponse={vote.commentOnResponse}
            showNoteAfterVote={showNoteAfterVote}
            shortformResponse={poll.shortformResponse}
          />
        ) : (
          <VoteResultsDisplay
            pollId={poll._id}
            voteCategory={vote.category}
            voteTruthScore={vote.truthScore}
            pollCategory={poll.crowdSourcedCategory}
            pollTruthScore={poll.crowdSourcedTruthScore}
            communityNoteCategory={vote.responseCategory}
            hasCommunityNote={poll.shortformResponse.en===null ? false : true}
          />
        )}
      </div>
    </>
  );
};
