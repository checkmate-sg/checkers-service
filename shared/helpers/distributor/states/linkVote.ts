import { BaseState } from "./base";
import { DistributionStep } from "../interface/step";
import { CheckerDBService } from "../interface/db";
import { DistributionContext } from "../interface/context";
import { ObjectId } from "mongodb";

export class LinkVoteState extends BaseState {
  constructor(private db: CheckerDBService) {
    super();
  }

  async execute(ctx: DistributionContext): Promise<DistributionContext> {
    if (!ctx.voteId) {
      throw new Error("missing vote id, nothing to link");
    }

    if (!ctx.telegramMsgId) {
      throw new Error("missing telegram id, nothing to link");
    }

    const res = await this.db.updateOneVote(
      { _id: new ObjectId(ctx.voteId) },
      {
        $set: {
          telegramMessageId: ctx.telegramMsgId,
        },
      }
    );

    if (!res.success) {
      throw new Error(res.error ?? "failed to link vote to telegram message");
    }

    ctx.step = DistributionStep.CHECKER_TO_VOTE_LINKED;

    return ctx;
  }

  async rollback(ctx: DistributionContext): Promise<void> {
    if (!ctx.voteId) return;

    await this.db.updateOneVote(
      { _id: new ObjectId(ctx.voteId) },
      {
        $unset: {
          telegramMessageId: "",
        },
      }
    );
  }
}
