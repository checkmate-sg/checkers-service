import { Filter, UpdateFilter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
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

        // console.log(result.data);

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
            return Err.internal("Failed to udpate vote")
        };

        if (result.modifiedCount === 0) {
            return Err.notFound("Vote not found or no changes made");
        };

        return NextResponse.json({
            message: "Vote successfully updated",
            id: voteId
        }, {status: 201});

    } catch (error) {
        console.error("Error updating the vote: ", error);
        return Err.internal("Internal Server Error")
    }
}