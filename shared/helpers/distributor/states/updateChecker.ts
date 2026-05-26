import { BaseState } from "./base";
import { CheckerDBService } from "../interface/db";
import { DistributionContext } from "../interface/context";
import { ObjectId } from "mongodb";
import { DistributionStep } from "../interface/step";

export class UpdateCheckerState extends BaseState {
  constructor(private db: CheckerDBService) {
    super();
  }

  async execute(ctx: DistributionContext) {
    const res = await this.db.updateOneChecker(
      { _id: new ObjectId(ctx.checker._id) },
      {
        $inc: { dailyAssignmentCount: 1 },
      }
    );

    if (!res.success) {
      throw new Error(res.error ?? "checker reserve failed");
    }

    ctx.step = DistributionStep.CHECKER_RESERVED;
    return ctx;
  }

  async rollback(ctx: DistributionContext) {
    await this.db.updateOneChecker(
      { _id: new ObjectId(ctx.checker._id) },
      {
        $inc: { dailyAssignmentCount: -1 },
      }
    );
  }
}
