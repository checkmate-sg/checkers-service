import { BaseState } from "../states/base";
import { DistributionContext } from "../interface/context";
import { DistributionStatus } from "../interface/status";

export class StateRunner {
  private executed: BaseState[] = [];
  private to_execute: BaseState[];

  constructor(states: BaseState[]) {
    this.to_execute = states;
  }

  async run(ctx: DistributionContext): Promise<DistributionContext> {
    try {
      for (const state of this.to_execute) {
        ctx = await state.execute(ctx);
        this.executed.push(state);
        ctx.updatedAt = new Date();
      }

      ctx.status = DistributionStatus.COMPLETED;
      return ctx;
    } catch (err) {
      ctx.error = err instanceof Error ? err.message : String(err);
      await this.rollback(ctx);
      ctx.status = DistributionStatus.ROLLED_BACK;
      return ctx;
    }
  }

  private async rollback(ctx: DistributionContext) {
    for (const state of [...this.executed].reverse()) {
      if (!state.rollback) continue;
      try {
        await state.rollback(ctx);
      } catch (err) {
        if (ctx.status !== DistributionStatus.FAILED) {
          ctx.status = DistributionStatus.FAILED;
        }
        console.error(
          `rollback failed at state: ${state.constructor.name} for poll_id: ${ctx.pollId}`,
          err
        );
      }
    }
  }
}
