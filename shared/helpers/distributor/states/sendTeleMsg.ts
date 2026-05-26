import { BaseState } from "./base";
import { DistributionContext } from "../interface/context";
import { DistributionStep } from "../interface/step";
import { VoteNotifier, buildVotePreviewText } from "../../telegram";

export class SendTelegramState extends BaseState {
  constructor(private notifier: VoteNotifier) {
    super();
  }

  async execute(ctx: DistributionContext): Promise<DistributionContext> {
    if (!ctx.voteId) {
      throw new Error("missing vote id, nothing to llink");
    }

    const previewText = buildVotePreviewText(ctx.pollText, ctx.pollImageUrl);

    const msg = await this.notifier.sendVoteMessage(
      ctx.checker.telegramId,
      ctx.voteId,
      previewText
    );

    ctx.telegramMsgId = msg.message_id;
    ctx.step = DistributionStep.TELEGRAM_MSG_SENT;

    return ctx;
  }

  async rollback(ctx: DistributionContext): Promise<void> {
    if (!ctx.telegramMsgId) return;
    try {
      await this.notifier.deleteVoteMessage(ctx.checker.telegramId, ctx.telegramMsgId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("failed to rollback telegram msg:", errorMessage);
    }
  }
}
