'use client';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { VoteMessageCard } from './voteMessageCard';

interface VoteDashboardProps {
    checkerId: string;
}

export const VoteDashboard = ({ checkerId }: VoteDashboardProps) => {
    const [activeTab, setActiveTab] = useState<string>("pending");
    const votes = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]; // Placeholder for votes data
    return (
        <div className="max-w-md mx-auto">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-[calc(100dvh-9rem)] flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="voted">Voted</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                <TabsContent value="pending">
                     {/* Messages List */}
                     {votes.map((vote) => {
                        return (
                        <VoteMessageCard 
                            externalId={"check_123456"}
                            text={"This is a sample message to be voted on."}
                            imageUrl={null}
                            startedTimestamp={"2025-09-29T13:56:24.999+00:00"}
                            category={null}
                            truthScore={null}
                            responseCategory={null}
                            commentOnResponse={null}/>  
                        )
                     })}
                    
                </TabsContent>

                <TabsContent value="voted">
                    <VoteMessageCard 
                            externalId={"check_123456"}
                            text={"This is a message to be voted on."}
                            imageUrl={null}
                            startedTimestamp={"2025-09-29T13:56:24.999+00:00"}
                            category={"unsure"}
                            crowdSourcedCategory={"unsure"}
                            truthScore={null}
                            responseCategory={null}
                            commentOnResponse={null}/>
                    <VoteMessageCard 
                        externalId={"check_123456"}
                        text={"This is a sample message to be voted on."}
                        imageUrl={null}
                        startedTimestamp={"2025-09-29T13:56:24.999+00:00"}
                        category={"scam"}
                        crowdSourcedCategory={"scam"}
                        truthScore={null}
                        responseCategory={null}
                        commentOnResponse={null}/>
                    <VoteMessageCard 
                        externalId={"check_123456"}
                        text={"This is a sample message to be voted on."}
                        imageUrl={null}
                        startedTimestamp={"2025-09-29T13:56:24.999+00:00"}
                        category={"scam"}
                        crowdSourcedCategory={"illicit"}
                        truthScore={null}
                        responseCategory={null}
                        commentOnResponse={null}/>
                </TabsContent>
                </div>
            </Tabs>

           

        </div>
    )

}