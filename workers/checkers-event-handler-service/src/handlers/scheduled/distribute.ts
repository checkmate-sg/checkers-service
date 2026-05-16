import { PollDistributor } from "@/shared/helpers/distribution";
import { getStartAndEndOfDaySGT } from "@/shared/utils/date";
import { Bot } from "grammy";

const NEEDED_VOTES = 30;

export async function runRedistribution(env: Env, bot: Bot) {
  const distributor = new PollDistributor(env.HOST_URL, env.CHECKERS_DB_SERVICE, bot);

  const res = await getDailyOpenPollsWithVotes(env);

  if (!res.success || !res.data) {
    console.error("failed to fetch open polls", res.error);
    return;
  }

  for (const poll of res.data) {
    const completed = poll.completedVotes ?? 0;
    const needed = NEEDED_VOTES - completed;

    if (needed <= 0) continue;

    await distributor.distribute(
      {
        pollId: poll._id,
        text: poll.text,
        imageUrl: poll.imageUrl,
        limit: needed,
      },
      {
        waitUntil: (p: Promise<any>) => {
          p.catch(console.error);
        },
      }
    );
  }
}

async function getDailyOpenPollsWithVotes(env: Env) {
  const { start, end } = getStartAndEndOfDaySGT();

  return env.CHECKERS_DB_SERVICE.aggregatePolls([
    {
      $match: {
        startedTimestamp: { $gte: start, $lt: end },
        assessedTimestamp: null,
      },
    },
    {
      $lookup: {
        from: "votes",
        let: { pollId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$pollId", "$$pollId"] },
            },
          },
        ],
        as: "votes",
      },
    },
    {
      $addFields: {
        totalVotes: { $size: "$votes" },
        completedVotes: {
          $size: {
            $filter: {
              input: "$votes",
              as: "v",
              cond: { $ne: ["$$v.votedTimestamp", null] },
            },
          },
        },
      },
    },
    {
      $project: { votes: 0 },
    },
  ]);
}
