import { BasePollDistributor } from "./interface/distributor";
import { CheckerDBService } from "./interface/db";
import { Bot } from "grammy";
import { CheckerAPI } from "@/shared/types/schema";
import { isCurrentSGTBetweenHours } from "@/shared/utils/date";

export class InitialPhaseDistributor extends BasePollDistributor {
  constructor(hostUrl: string, bot: Bot, db: CheckerDBService) {
    super(hostUrl, bot, db);
  }

  protected async getValidCheckers(
    pollId: string = null,
    limit: number = null
  ): Promise<CheckerAPI[]> {
    var res;

    if (isCurrentSGTBetweenHours(13, 18)) {
      res = await this.db.findCheckersWithBudget();
    } else {
      res = await this.db.findTopNCheckersWithBudget(30);
    }

    if (!res.success || !res.data) {
      return [];
    }
    return res.data;
  }
}
