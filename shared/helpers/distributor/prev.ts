import { BasePollDistributor } from "./interface/distributor";
import { CheckerDBService } from "./interface/db";
import { Bot } from "grammy";
import { CheckerAPI } from "@/shared/types/schema";

export class PreviousDistributor extends BasePollDistributor {
  constructor(hostUrl: string, bot: Bot, db: CheckerDBService) {
    super(hostUrl, bot, db);
  }

  protected async getValidCheckers(
    pollId: string = null,
    limit: number = null
  ): Promise<CheckerAPI[]> {
    console.log(`utilising previous full distribution for:`, pollId);
    const res = await this.db.findCheckersWithBudget();
    if (!res.success) {
      console.error(`failed to get results from db: ${res.error}`);
      return [];
    }
    return res.data;
  }
}
