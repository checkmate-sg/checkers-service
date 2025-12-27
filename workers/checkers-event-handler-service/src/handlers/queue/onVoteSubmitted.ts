import type { VoteSubmittedData } from "../../types";

/**
 * Handle vote.submitted events from the queue
 */
export async function handleVoteSubmitted(
  env: Env,
  data: VoteSubmittedData
): Promise<void> {
  console.log(`Processing vote.submitted for voteId: ${data.voteId}`);

  // TODO: Fetch vote from DB to get pollId, then run vote assessment
  // This will be moved from the main API route once the queue flow is fully tested
}
