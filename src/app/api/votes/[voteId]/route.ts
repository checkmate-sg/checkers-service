import { Filter, UpdateFilter } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { Err } from '@/lib/api/error';
import {
  checkAccuracy,
  computeGamificationScore
} from '@/lib/helpers/leaderboardStats/statsHelpers';
import { voteAssessment } from '@/lib/helpers/voteAssessment/voteAssessment';
import { Vote } from '@/lib/request/external/lib/data-contracts';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function GET(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { voteId } = await params;
    if (!voteId) return Err.badParams("Missing voteId parameter");

    const result = await env.CHECKERS_DB_SERVICE.findOneVote({
      _id: voteId,
    });

    if (!result.success) {
      return Err.notFound();
    }

    const vote = result.data;
    return NextResponse.json(vote, { status: 200 });
  } catch (error) {
    return Err.internal();
  }
}

export async function POST(req: NextRequest, { params }) {
  const { env } = getCloudflareContext();

  try {
    const session = await auth();
    if (!session?.user) return Err.unauthorized();

    const { voteId } = await params;
    if (!voteId) return Err.badParams("Missing voteId parameter");

    // Parse request body to get update fields
    const body = await req.json();

    // Validate that we have fields to update
    if (!body || Object.keys(body).length === 0) {
      return Err.badParams();
    }

    // Extract update fields (Based on Vote Schema)
    const { category, truthScore, responseCategory, commentOnResponse, ...otherFields } = body;

    // Create Filter to find the vote by ID
    const filter: Filter<Vote> = {
      _id: voteId,
    };

    // Get the Vote
    const voteResult = await env.CHECKERS_DB_SERVICE.findOneVote(filter);

    console.log(voteResult);

    if (!voteResult.success) {
      return Err.notFound();
    }

    const currentTimestamp = new Date();
    const createdTimestamp = new Date(voteResult.data.createdTimestamp);
    // Convert to hours
    const responseTimeInHours = (currentTimestamp.getTime() - createdTimestamp.getTime()) / (1000 * 60 * 60);

    // Create update object with $set operator
    const update: UpdateFilter<Vote> = {
      $set: {
        ...(category !== undefined && { category }),
        ...(truthScore !== undefined && { truthScore }),
        ...(responseCategory !== undefined && { responseCategory }),
        ...(commentOnResponse !== undefined && { commentOnResponse }),
        ...otherFields,
        votedTimestamp: currentTimestamp,
        responseTime: responseTimeInHours,
      },
    };

    // Update the Vote
    const result = await env.CHECKERS_DB_SERVICE.updateOneVote(filter, update);

    if (!result.success) {
      return Err.internal("Failed to update vote");
    }

    if (result.modifiedCount === 0) {
      return Err.notFound("Vote not found or no changes made");
    }

    // Increase numVoted in Checkers only if this is a first-time vote (voteTimestamp was null)
    if (voteResult.data.votedTimestamp === null) {
      const checkerId = session.user.id;
      const checkerUpdateResult = await env.CHECKERS_DB_SERVICE.updateOneChecker(
        {_id: checkerId},
        {$inc: {numVoted: 1}}
      );

      if (!checkerUpdateResult.success) {
        console.error("Error updating checker numVote: ", checkerUpdateResult.error);
        // Don't fail the request - the vote was already saved
      }
    }

    // Vote Service to calculate whether the votes are correct/wrong
    const pollId = voteResult.data.pollId;
    const crowdSourcedCategoryResults = await voteAssessment(pollId);
    if (!crowdSourcedCategoryResults.success) {
      console.error("Error in vote assessment: ", crowdSourcedCategoryResults.error);
      return Err.internal("Error in Vote assessment");
    } else if (crowdSourcedCategoryResults.data === null) {
      // console.log("Poll not yet assessed");
    } else {
      const { primaryCategory: crowdSourcedCategory, truthScore: crowdSourcedTruthScore, isDownvoted } = crowdSourcedCategoryResults.data;

      // Update Poll with the assessed crowdSourcedCategory - use _id (pollId)
      // Returns previousDocument for change detection
      const pollUpdateResult = await env.CHECKERS_DB_SERVICE.updateOnePoll(
        { _id: pollId },
        {
          $set: {
            crowdSourcedCategory: crowdSourcedCategory,
            crowdSourcedTruthScore: crowdSourcedTruthScore,
            assessedTimestamp: new Date(),
            "shortformResponse.downvoted": isDownvoted,
          },
        }
      );

      console.log("POLL UPDATED: ", pollUpdateResult.modifiedCount)

      if (!pollUpdateResult.success) {
        console.error(
          "Error updating the poll with crowdSourcedCategory: ",
          pollUpdateResult.error
        );
        return Err.internal("Error updating the poll with crowdSourcedCategory");
      }

      // Check if the Votes are correct 
      const isCorrect = checkAccuracy(category, truthScore, crowdSourcedCategory, crowdSourcedTruthScore);
      const voteScores = computeGamificationScore(createdTimestamp, currentTimestamp, isCorrect);

      // Update the Vote with voteScores
      const voteScoresResults = await env.CHECKERS_DB_SERVICE.updateOneVote(filter, {
        $set: {
          isCorrect: isCorrect,
          score: voteScores
        },
      });

      if (!voteScoresResults.success) {
        console.error(
          "Error updating the votes with voteScores: ",
          voteScoresResults.error
        );
        return Err.internal("Error updating the votes with voteScores");
      }

      // Queue message if category or downvoted status changed
      const prev = pollUpdateResult.previousDocument;
      if (prev) {
        const categoryChanged = prev.crowdSourcedCategory !== crowdSourcedCategory;
        const downvotedChanged = (prev.shortformResponse?.downvoted ?? false) !== isDownvoted;

        if (categoryChanged || downvotedChanged) {
          try {
            await env.POLL_UPDATE_QUEUE.send({
              id: prev.checkId,
              isHumanAssessed: true,
              crowdsourcedCategory: crowdSourcedCategory,
              isCommunityNoteDownvoted: isDownvoted,
            });
          } catch (queueError) {
            console.error("Failed to queue poll update message:", queueError);
            // Don't fail the request - just log
          }
        }
      }
    }

    return NextResponse.json(
      {
        message: "Vote successfully updated",
        id: voteId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error updating the vote: ", error);
    return Err.internal("Internal Server Error");
  }
}
