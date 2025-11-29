import { Filter, UpdateFilter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import { voteAssessment } from '@/lib/helpers/voteAssessment/voteAssessment';
import { Vote } from '@/lib/request/external/lib/data-contracts';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, {params}) {
    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();

        const {voteId} = await params; 
        if (!voteId) return Err.badParams("Missing voteId parameter");

        const result = await env.CHECKERS_DB_SERVICE.findOneVote(
            {
                _id: voteId
            }
        );

        if (!result.success) {
            return Err.notFound();
        }

        const vote = result.data 
        return NextResponse.json(vote, {status: 200});
    } catch (error) {
        return Err.internal();
    }
}

export async function POST(req: NextRequest, {params}) {
    const { env } = getCloudflareContext();

    try {
        const session = await auth();
        if (!session?.user) return Err.unauthorized();
        
        const {voteId} = await params; 
        if (!voteId) return Err.badParams("Missing voteId parameter");

        // Parse request body to get update fields 
        const body = await req.json();

        // Validate that we have fields to update 
        if (!body || Object.keys(body).length === 0) {
            return Err.badParams()
        }

        // Extract update fields (Based on Vote Schema)
        const {
            category,
            truthScore,
            responseCategory,
            commentOnResponse, 
            ...otherFields
        } = body;

        // Create Filter to find the vote by ID 
        const filter: Filter<Vote> = {
            _id: voteId
        }

        // Get the Vote 
        const voteResult = await env.CHECKERS_DB_SERVICE.findOneVote(filter);

        if (!voteResult.success) {
            return Err.notFound();
        }

        // Create update object with $set operator 
        const update: UpdateFilter<Vote> = {
            $set: {
                ...(category !== undefined && { category }),
                ...(truthScore !== undefined && { truthScore }),
                ...(responseCategory !== undefined && { responseCategory }),
                ...(commentOnResponse !== undefined && { commentOnResponse}),
                ...otherFields, 
                votedTimestamp: new Date()
            }
        };

        // Update the Vote 
        const result = await env.CHECKERS_DB_SERVICE.updateOneVote(filter, update);

        if (!result.success) {
            return Err.internal("Failed to update vote")
        };

        if (result.modifiedCount === 0) {
            return Err.notFound("Vote not found or no changes made");
        };

        // Vote Service to calculate whether the votes are correct/wrong 
        const pollId = voteResult.data.pollId;
        const crowdSourcedCategoryResults = await voteAssessment(pollId);
        if (!crowdSourcedCategoryResults.success) {
            console.error("Error in vote assessment: ", crowdSourcedCategoryResults.error);
            return Err.internal("Error in Vote assessment");
        } else if (crowdSourcedCategoryResults.data === null) {
            console.log("Poll not yet assessed");
        } else {
            // Update Poll with the assesed crowdSourcedCategory - use externalId (pollId)
            const pollUpdateResult = await env.CHECKERS_DB_SERVICE.updateOnePoll(
                { externalId: pollId },
                { $set: { 
                    crowdSourcedCategory: crowdSourcedCategoryResults.data.primaryCategory,
                    crowdSourcedTruthScore: crowdSourcedCategoryResults.data.truthScore,
                    assessedTimestamp: new Date()
                 } 
                }
            );

            if (!pollUpdateResult.success) {
                console.error("Error updating the poll with crowdSourcedCategory: ", pollUpdateResult.error);
                return Err.internal("Error updating the poll with crowdSourcedCategory");
            } 
        }

        return NextResponse.json({
            message: "Vote successfully updated",
            id: voteId
        }, {status: 201});

    } catch (error) {
        console.error("Error updating the vote: ", error);
        return Err.internal("Internal Server Error")
    }
}