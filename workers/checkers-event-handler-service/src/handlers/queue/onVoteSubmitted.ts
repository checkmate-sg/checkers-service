import { checkGraduation } from "@/shared/helpers/checkGraduation";
import { checkAccuracy, computeGamificationScore } from "@/shared/helpers/scoring";
import { voteAssessment } from "@/shared/helpers/voteAssessment";

import type { VoteSubmittedData } from "../../types";
import { updateVoteButtonText } from "../../utils";
/**
 * Handle vote.submitted events from the queue
 *
 * Flow:
 * 1. Fetch vote to get pollId
 * 2. Run vote assessment
 * 3. If assessed:
 *    - Update poll with crowdSourcedCategory (uses previousDocument to prevent race conditions)
 *    - Score the submitter's vote
 *    - Emit assessment.complete or primaryCategory.changed based on actual state change
 */
export async function handleVoteSubmitted(env: Env, data: VoteSubmittedData): Promise<void> {
  const { voteId } = data;
  console.log(`Processing vote.submitted for voteId: ${voteId}`);

  // 1. Fetch the vote to get pollId and vote details
  const voteResult = await env.CHECKERS_DB_SERVICE.findOneVote({ _id: voteId });
  if (!voteResult.success || !voteResult.data) {
    console.error(`Vote not found: ${voteId}`);
    return;
  }

  const vote = voteResult.data;
  const pollId = vote.pollId;

  // Calculate response time in hours
  let responseTime: number | null = null;
  if (vote.votedTimestamp && vote.createdTimestamp) {
    const votedTs = new Date(vote.votedTimestamp).getTime();
    const createdTs = new Date(vote.createdTimestamp).getTime();
    responseTime = (votedTs - createdTs) / (1000 * 60 * 60);
  }

  // Check if this is first vote (responseTime was null) vs edit
  const isFirstVote = vote.responseTime === null;

  // Update vote with responseTime
  if (responseTime !== null) {
    await env.CHECKERS_DB_SERVICE.updateOneVote({ _id: voteId }, { $set: { responseTime } });
  }

  // Update checker's stats
  // - Always update lastVotedTimestamp (for activity tracking)
  // - Only increment numVoted on first vote (not edits)
  if (isFirstVote) {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: vote.checkerId },
      {
        $inc: { numVoted: 1 },
        $set: { lastVotedTimestamp: new Date() },
      }
    );
  } else {
    await env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: vote.checkerId },
      { $set: { lastVotedTimestamp: new Date() } }
    );
  }

  // Update Telegram button text to indicate vote was submitted
  await updateVoteButtonText(env, vote);

  // 2. Run vote assessment
  const assessmentResult = await voteAssessment(env.CHECKERS_DB_SERVICE, pollId);
  if (!assessmentResult.success) {
    console.error(`Vote assessment failed: ${assessmentResult.error}`);
    return;
  }

  // If not yet assessed, nothing more to do
  if (assessmentResult.data === null) {
    console.log(`Poll ${pollId} not yet assessed`);
    return;
  }

  const { primaryCategory, truthScore, isDownvoted } = assessmentResult.data;

  // 3. Update poll with assessment results
  // Use previousDocument to detect actual state changes (prevents race conditions)
  const pollUpdateResult = await env.CHECKERS_DB_SERVICE.updateOnePoll(
    { _id: pollId },
    {
      $set: {
        crowdSourcedCategory: primaryCategory,
        crowdSourcedTruthScore: truthScore,
        assessedTimestamp: new Date(),
        "shortformResponse.downvoted": isDownvoted,
      },
    }
  );

  if (!pollUpdateResult.success) {
    console.error(`Failed to update poll: ${pollUpdateResult.error}`);
    return;
  }

  const prev = pollUpdateResult.previousDocument;
  const previousCategory = prev?.crowdSourcedCategory ?? null;
  const previousDownvoted = prev?.shortformResponse?.downvoted ?? false;

  // Determine what actually changed based on previousDocument
  const isFirstAssessment = previousCategory === null;
  const categoryChanged = !isFirstAssessment && previousCategory !== primaryCategory;
  const downvotedChanged = previousDownvoted !== isDownvoted;

  // 4. Score the submitter's vote (if poll is assessed)
  if (vote.votedTimestamp && vote.createdTimestamp) {
    const isCorrect = checkAccuracy(vote.category, vote.truthScore, primaryCategory, truthScore);
    const score = computeGamificationScore(
      new Date(vote.createdTimestamp),
      new Date(vote.votedTimestamp),
      isCorrect
    );

    await env.CHECKERS_DB_SERVICE.updateOneVote({ _id: voteId }, { $set: { isCorrect, score } });
  }

  // Check if this vote triggers graduation for the checker
  await checkGraduation(env, vote.checkerId);

  // 5. Emit follow-up events based on actual state changes
  if (isFirstAssessment) {
    console.log(`Emitting assessment.complete for poll ${pollId}`);
    await env.CHECKERS_EVENTS_QUEUE.send({
      type: "assessment.complete",
      data: { pollId, primaryCategory, truthScore, isDownvoted },
      timestamp: new Date().toISOString(),
    });
  } else if (categoryChanged) {
    console.log(`Emitting primaryCategory.changed for poll ${pollId}`);
    await env.CHECKERS_EVENTS_QUEUE.send({
      type: "primaryCategory.changed",
      data: { pollId, primaryCategory, truthScore, isDownvoted },
      timestamp: new Date().toISOString(),
    });
  }

  // 6. Queue poll update to CheckMate if category or downvoted changed
  if ((isFirstAssessment || categoryChanged || downvotedChanged) && prev?.checkId) {
    try {
      await env.POLL_UPDATE_QUEUE.send({
        id: prev.checkId,
        isHumanAssessed: true,
        crowdsourcedCategory: primaryCategory,
        isCommunityNoteDownvoted: isDownvoted,
      });
      console.log(`Queued poll update for checkId: ${prev.checkId}`);
    } catch (queueError) {
      console.error("Failed to queue poll update:", queueError);
    }
  }
}
