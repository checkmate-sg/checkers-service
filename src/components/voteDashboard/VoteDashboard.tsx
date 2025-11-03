'use client';

import { useState } from 'react';

import { useGetCheckersVoteDetail } from '@/hooks/checkers/useGetCheckersVoteDetail';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { InfiniteVoteMessageList } from './InfiniteVoteMessageList';

interface VoteDashboardProps {
    checkerId: string;
}

export const VoteDashboard = ({ checkerId }: VoteDashboardProps) => {
    const [activeTab, setActiveTab] = useState<string>("pending");

    return (
        <div className="max-w-md mx-auto">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-[calc(100dvh-9rem)] flex-col m-2">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="voted">Voted</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                <TabsContent value="pending">
                     <InfiniteVoteMessageList 
                        useGetCheckersVoteDetailHook={useGetCheckersVoteDetail}
                        voteCheckerStatus={false}
                        checkerId={checkerId}
                        sorting="createdTimestamp"
                    />
                </TabsContent>

                <TabsContent value="voted">
                    <InfiniteVoteMessageList 
                        useGetCheckersVoteDetailHook={useGetCheckersVoteDetail}
                        voteCheckerStatus={true}
                        checkerId={checkerId}
                        sorting="votedTimestamp"
                    />
                </TabsContent>
                </div>
            </Tabs>

           

        </div>
    )

}