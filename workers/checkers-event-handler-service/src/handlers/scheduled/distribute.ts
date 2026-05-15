import { PollDistributor } from "@/shared/helpers/distribution";
import { Bot } from "grammy";

export async function runRedistribution(env: Env, bot: Bot) {
  const distributor = new PollDistributor(env.HOST_URL, env.CHECKERS_DB_SERVICE, bot);
}

async function getOpenPolls(env: Env) {}

function getDistributionCount() {}
