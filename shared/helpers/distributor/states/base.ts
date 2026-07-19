import { DistributionContext } from "../interface/context";

export abstract class BaseState {
  abstract execute(ctx: DistributionContext): Promise<DistributionContext>;

  rollback?(ctx: DistributionContext): Promise<void>;

  logOnError(ctx: DistributionContext, error: unknown): void {
    console.error(`[${ctx.step}]`, error);
  }

  async safeExecute(ctx: DistributionContext): Promise<DistributionContext> {
    try {
      return await this.execute(ctx);
    } catch (err) {
      this.logOnError(ctx, err);
      ctx.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }
}
