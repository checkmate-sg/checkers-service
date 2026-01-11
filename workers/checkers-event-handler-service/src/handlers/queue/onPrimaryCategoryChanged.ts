import { scoreAllVotesForPoll } from "../../helpers/scoreVotes";
import type { PrimaryCategoryChangedData } from "../../types";

/**
 * Handle primaryCategory.changed events
 * Re-scores ALL votes when the consensus category changes
 */
export async function handlePrimaryCategoryChanged(
  env: Env,
  data: PrimaryCategoryChangedData
): Promise<void> {
  const { pollId, primaryCategory, truthScore } = data;
  console.log(
    `Processing primaryCategory.changed for poll ${pollId}, new category: ${primaryCategory}`
  );

  await scoreAllVotesForPoll(env, pollId, primaryCategory, truthScore);
}
