import { BasePollDistributor } from "./interface/distributor";
import { CheckerDBService } from "./interface/db";
import { Bot } from "grammy";
import { CheckerAPI } from "@/shared/types/schema";

export class RedistributionPhaseDistributor extends BasePollDistributor {
  constructor(hostUrl: string, bot: Bot, db: CheckerDBService) {
    super(hostUrl, bot, db);
  }

  protected async getValidCheckers(pollId: string, limit: number): Promise<CheckerAPI[]> {
    console.log("starting redistribution logic for: ", pollId);
    const res = await this.db.findCheckersForRedistribution(pollId, limit);
    if (!res.success) {
      console.error(`failed to get results from db: ${res.error}`);
      return [];
    }
    return res.data ?? [];
  }
}
