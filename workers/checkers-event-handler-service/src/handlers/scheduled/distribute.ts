import { MIN_VOTES_NEEDED } from "@/shared/constants";
import { RedistributionPhaseDistributor } from "@/shared/helpers/distributor/post";
import { getStartAndEndOfDaySGT } from "@/shared/utils/date";
import { Bot } from "grammy";

export async function runRedistribution(env: Env, bot: Bot) {
  const distributor = new RedistributionPhaseDistributor(
    env.HOST_URL,
    bot,
    env.CHECKERS_DB_SERVICE
  );

  const res = await getDailyOpenPollsWithVotes(env);

  if (!res.success || !res.data) {
    console.error("failed to fetch open polls", res.error);
    return;
  }

  console.log(`discovered ${res.data.length} open polls to run redistribution over`);

  for (const poll of res.data) {
    const completed = poll.completedVotes ?? 0;
    const needed = MIN_VOTES_NEEDED - completed;

    if (needed <= 0) continue;

    try {
      const results = await distributor.distribute({
        pollId: poll._id,
        text: poll.text,
        imageUrl: poll.imageUrl,
        limit: needed,
      });

      console.log("redistribution results:", results);
    } catch (err) {
      console.error(`failed to distribute poll ${poll._id}:`, err);
    }
  }
}

async function getDailyOpenPollsWithVotes(env: Env) {
  const { start, end } = getStartAndEndOfDaySGT();

  return env.CHECKERS_DB_SERVICE.getOpenPollsWithVotes(
    start.toISOString(),
    end.toISOString(),
    MIN_VOTES_NEEDED
  );
}
