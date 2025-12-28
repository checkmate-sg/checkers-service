import { scoreAllVotesForPoll } from "../../helpers/scoreVotes";
import type { AssessmentCompleteData } from "../../types";

/**
 * Handle assessment.complete events
 * Scores ALL votes for the poll when first assessed
 */
export async function handleAssessmentComplete(
  env: Env,
  data: AssessmentCompleteData
): Promise<void> {
  const { pollId, primaryCategory, truthScore } = data;
  console.log(`Processing assessment.complete for poll ${pollId}`);

  await scoreAllVotesForPoll(env, pollId, primaryCategory, truthScore);
}
