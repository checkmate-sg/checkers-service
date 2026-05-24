import { MIN_VOTES_NEEDED } from "@/shared/constants";
import { PollDistributor } from "@/shared/helpers/distribution";
import { getStartAndEndOfDaySGT } from "@/shared/utils/date";
import { Bot } from "grammy";

export async function runRedistribution(env: Env, bot: Bot) {
  const distributor = new PollDistributor(env.HOST_URL, env.CHECKERS_DB_SERVICE, bot);

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
      await distributor.distribute({
        pollId: poll._id,
        text: poll.text,
        imageUrl: poll.imageUrl,
        limit: needed,
      });
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
