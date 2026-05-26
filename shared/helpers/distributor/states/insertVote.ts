import { BaseState } from "./base";
import { CheckerDBService } from "../interface/db";
import { DistributionContext } from "../interface/context";
import { DistributionStep } from "../interface/step";

export class InsertVoteState extends BaseState {
  constructor(private db: CheckerDBService) {
    super();
  }

  async execute(ctx: DistributionContext) {
    const res = await this.db.insertVote(ctx.vote);

    if (!res.success || !res.id) {
      throw new Error(res.error ?? "failed to insert vote into checkers db");
    }

    ctx.voteId = res.id;
    ctx.step = DistributionStep.VOTE_INSERTED;

    return ctx;
  }

  async rollback(ctx: DistributionContext) {
    if (!ctx.voteId) return;
    await this.db.deleteOneVote(ctx.voteId);
  }
}
