'use client';

import { Loader2 } from 'lucide-react';

import { useGetPollDetailsById } from '@/hooks/polls/useGetPollDetails';

import MessageCard from './MessageCard';

interface VoteContentProps {
    checkerId: string;
    pollId: string;
}
export const VoteContent = ({
    checkerId,
    pollId // externalId
}: VoteContentProps) => {
    // Fetch the poll using pollId 
    const { data: poll, isLoading, error } = useGetPollDetailsById(pollId);

    console.log(poll);

    if (isLoading) return (
        <div className="p-4 max-w-md mx-auto flex items-center justify-center min-h-[200px]">
          <Loader2 className="animate-spin" size={32} />
        </div>
    );

    return (
        <>
            <div
                className="grid grid-flow-row items-center gap-2 pb-2 left-right-padding mb-2"
            >
                <MessageCard 
                    text = {poll.text}
                    caption = {poll.caption}
                    imageUrl = {poll.imageURL}/>
            </div>
        </>
    )
}