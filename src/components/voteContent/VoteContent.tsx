'use client';

import { Loader2 } from 'lucide-react';

import { useGetVotesByCheckersIdNPollId } from '@/hooks/checkers/useGetCheckersVoteDetail';
import { useGetPollDetailsById } from '@/hooks/polls/useGetPollDetails';

import CommunityNoteCard from './CommunityNoteCard';
import MessageCard from './MessageCard';
import VotingSystem from './VotingSystem';

interface VoteContentProps {
    checkerId: string;
    pollId: string;
}
export const VoteContent = ({
    checkerId,
    pollId // externalId
}: VoteContentProps) => {

    // Fetch the poll using pollId 
    const { data: poll, isLoading: isLoading_Poll, error: isError_Poll } = useGetPollDetailsById(pollId);

    const {data: vote, isLoading: isLoading_Vote, error: isError_Vote} = useGetVotesByCheckersIdNPollId(checkerId, pollId);
    

    if (isLoading_Poll || isLoading_Vote) return (
        <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
          <Loader2 className="animate-spin" size={32} />
        </div>
    );
    console.log("Vote: ", vote);
    console.log("poll:", poll);

    // handle error states
    if (isError_Poll) return <div>Failed to load poll</div>;

    return (
        <>
            <div
                className="grid grid-flow-row items-center gap-2 p-2 left-right-padding"
            >
                <MessageCard 
                    text = {poll.text}
                    caption = {poll.caption}
                    imageUrl = {poll.imageURL}/>
                
                {poll.longformResponse ? (
                    <CommunityNoteCard 
                    longformEN = {poll.longformResponse.en}
                    longformCN = {poll.longformResponse.cn}
                    longformLinks = {poll.longformResponse.links}/>
                ) : null}
                {
                vote && 
                     <VotingSystem 
                        voteRequestId={vote._id}
                        category={vote.category}
                        truthScore={vote.truthScore}
                        responseCategory={vote.responseCategory}
                        commentOnResponse={vote.commentOnResponse}
                    />
                 }
               
            </div>
        </>
    )
}