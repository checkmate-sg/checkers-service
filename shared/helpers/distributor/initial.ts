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
      console.log("detected current time in window, full distribution for:", pollId);
      res = await this.db.findCheckersWithBudget();
    } else {
      console.log("detected current time out of window, budgeted distribution for:", pollId);
      res = await this.db.findTopNCheckersWithBudget(30);
    }

    if (!res.success) {
      console.error(`failed to get results from db: ${res.error}`);
      return [];
    }
    return res.data ?? [];
  }
}
