import { isFulfilled } from "../../../utils/promise";
import { StateRunner } from "../orchestration/runner";
import { CheckerAPI, Vote, VoteAPI } from "@/shared/types/schema";
import { InsertVoteState } from "../states/insertVote";
import { SendTelegramState } from "../states/sendTeleMsg";
import { LinkVoteState } from "../states/linkVote";
import { UpdateCheckerState } from "../states/updateChecker";
import { CheckerDBService } from "./db";
import { DistributionContext } from "./context";
import { DistributionStep } from "./step";
import { DistributionStatus } from "./status";
import { VoteNotifier } from "../../telegram";
import { Bot } from "grammy";
import { ObjectId } from "mongodb";
import { DistributionLoad } from "./load";

export abstract class BasePollDistributor {
  private runner: StateRunner;
  protected db: CheckerDBService;
  private hostUrl: string;
  private voteNotifier: VoteNotifier;
  protected bot: Bot;

  constructor(hostUrl: string, bot: Bot, db: CheckerDBService) {
    this.db = db;
    this.hostUrl = hostUrl;
    this.bot = bot;
    this.voteNotifier = new VoteNotifier(this.bot, this.hostUrl);
  }

  private createRunner() {
    return new StateRunner([
      new InsertVoteState(this.db),
      new SendTelegramState(this.voteNotifier),
      new LinkVoteState(this.db),
      new UpdateCheckerState(this.db),
    ]);
  }

  protected abstract getValidCheckers(pollId: string, limit: number): Promise<CheckerAPI[]>;

  private buildVoteRequest(pollId: string, checker: CheckerAPI): Omit<VoteAPI, "_id"> {
    return {
      pollId: pollId,
      checkerId: checker._id!,
      createdTimestamp: new Date(),
      votedTimestamp: null,
      category: null,
      truthScore: null,
      responseCategory: null,
      commentOnResponse: null,
      responseTime: null,
      score: null,
      isCorrect: null,
      showNoteAfterVote: Math.random() < 0.5,
      telegramMessageId: null,
    };
  }

  public async distribute(load: DistributionLoad) {
    const { pollId, text, imageUrl, limit } = load;

    const checkers = await this.getValidCheckers(pollId, limit);

    const results = await Promise.allSettled(
      checkers.map(checker => {
        const ctx: DistributionContext = {
          checker: checker,
          pollId: pollId,
          pollText: text,
          pollImageUrl: imageUrl,
          vote: this.buildVoteRequest(pollId, checker),
          step: DistributionStep.CREATED,
          status: DistributionStatus.RUNNING,
          createdAt: new Date(),
        };

        return this.createRunner().run(ctx);
      })
    );

    return this.aggregate(results);
  }

  private aggregate(results: PromiseSettledResult<DistributionContext>[]) {
    let completed = 0;
    let rolledBack = 0;
    let failed = 0;
    const contexts: DistributionContext[] = [];

    for (const result of results) {
      if (!isFulfilled(result)) {
        failed++;
        continue;
      }

      const ctx = result.value;
      contexts.push(ctx);
      switch (ctx.status) {
        case DistributionStatus.COMPLETED:
          completed++;
          break;
        case DistributionStatus.ROLLED_BACK:
          rolledBack++;
          break;
        case DistributionStatus.FAILED:
          failed++;
          break;
      }
    }

    return {
      success: failed === 0,
      assigned: results.length,
      completed,
      rolledBack,
      failed,
      results: contexts,
    };
  }
}
