import { Filter, UpdateFilter, type Document } from "mongodb";
import { Vote, CheckerAPI, VoteAPI } from "../types/schema";
import { Bot, InlineKeyboard } from "grammy";
import { ExecutionContext } from "@cloudflare/workers-types/experimental";

export interface CheckerAggregationService {
  aggregateCheckers<T = CheckerAPI>(
    pipeline: Document[]
  ): Promise<{
    success: boolean;
    data?: T[];
    error?: string;
  }>;

  insertVote(vote: Omit<VoteAPI, "_id">): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }>;

  updateOneVote(
    filter: Filter<Vote>,
    update: UpdateFilter<Vote>
  ): Promise<{
    success: boolean;
    error?: string;
  }>;

  deleteOneVote(filter: Filter<Vote>): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }>;
}

interface DistributionLoad {
  pollId: string;
  text?: string | null;
  imageUrl?: string | null;
  limit: number;
}

interface Ctx {
  waitUntil(promise: Promise<any>): void;
}

export class PollDistributor {
  private db: CheckerAggregationService;
  private bot: Bot;
  private hostUrl: string;

  constructor(hostUrl: string, db: CheckerAggregationService, bot: Bot) {
    this.hostUrl = hostUrl;
    this.db = db;
    this.bot = bot;
  }

  public async distribute(load: DistributionLoad, ctx: Ctx) {
    const { pollId, text, imageUrl, limit } = load;
    const { success, data: checkers = [], error } = await this.getValidCheckers(pollId, limit);

    if (!success) {
      console.error("problem with getting checkers:", error);
      throw new Error(error ?? "unknown error");
    }

    console.log(`"pulled ${checkers.length} valid checkers"`);

    const previewText = this.buildPreviewText(text, imageUrl);
    const voteRequests = this.buildVoteRequests(pollId, checkers);

    const sendResults = await Promise.allSettled(
      voteRequests.map((v, idx) => {
        const checker = checkers[idx];
        if (!checker)
          throw new Error(
            `unexpected length mismatch, checker length: ${checkers.length}, vote length: ${voteRequests.length}`
          );
        return this.processOneVote(checker, v, previewText, ctx);
      })
    );

    const noFailed = this.countFailures(sendResults);
    if (noFailed > 0) {
      console.error(`failed to distribute to ${noFailed} indivduals`);
    }
    return {
      success: true,
      assigned: voteRequests.length,
      failed: noFailed,
    };
  }

  private countFailures(
    results: PromiseSettledResult<{
      success: boolean;
      voteId?: string;
      error?: string;
    }>[]
  ) {
    return results.reduce((acc, r) => {
      if (r.status === "rejected") return acc + 1;

      if (r.status === "fulfilled" && r.value.success === false) {
        return acc + 1;
      }

      return acc;
    }, 0);
  }

  private buildPreviewText(text?: string | null, imageUrl?: string | null) {
    let previewText = "";

    if (text) {
      previewText = text.length > 50 ? `${text.substring(0, 50)}...` : text;
    }

    if (imageUrl) {
      previewText = previewText ? `${previewText}\n<Image 🖼️>` : "<Image 🖼️>";
    }

    return previewText;
  }

  private async sendOneVote(checker: CheckerAPI, voteId: string, previewText: string) {
    const voteRequestPath = `${this.hostUrl}/votes/${voteId}`;
    const keyboard = new InlineKeyboard().webApp("Vote 🗳️!", voteRequestPath);
    return await this.bot.api.sendMessage(checker.telegramId, previewText, {
      reply_markup: keyboard,
    });
  }

  private async processOneVote(
    checker: CheckerAPI,
    vote: Omit<VoteAPI, "_id">,
    previewText: string,
    ctx: Ctx
  ): Promise<{
    success: boolean;
    voteId?: string;
    error?: string;
  }> {
    const insertResult = await this.db.insertVote(vote);
    if (!insertResult.success || !insertResult.id) {
      console.error(
        `Problem creating vote entry for poll id ${vote.pollId}, checker id ${checker._id} with error: ${insertResult.error}`
      );
      return {
        success: false,
        error: insertResult.error ?? "insertVote failed",
      };
    }
    const voteId = insertResult.id;
    try {
      const sentMsg = await this.sendOneVote(checker, voteId, previewText);
      ctx.waitUntil(this.attachTelegramMessageIdAsync(voteId, sentMsg.message_id));
      return { success: true, voteId };
    } catch (err) {
      console.error(`telegram send failed for vote ${voteId} `, err);
      return {
        success: false,
        voteId,
        error: String(err),
      };
    }
  }

  private attachTelegramMessageIdAsync(voteId: string, messageId: number) {
    return this.db
      .updateOneVote({ _id: voteId as any }, { $set: { telegramMessageId: messageId } })
      .catch(err => {
        console.error(`telegram update failed vote ${voteId}`, err);
      });
  }

  private buildVoteRequests(pollId: string, data: CheckerAPI[]): Omit<VoteAPI, "_id">[] {
    return data.map(checker => ({
      pollId,
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
    }));
  }

  private async getValidCheckers(
    pollId: string,
    limit: number
  ): Promise<{
    success: boolean;
    data?: CheckerAPI[];
    error?: string;
  }> {
    try {
      const pipeline: Document[] = [
        {
          $match: {
            isActive: true,
            onboardingStatus: "completed",
          },
        },

        {
          $lookup: {
            from: "votes",
            let: { checkerId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$checkerId", "$$checkerId"] },
                      { $eq: [{ $toString: "$pollId" }, pollId] },
                    ],
                  },
                },
              },
            ],
            as: "voteForPoll",
          },
        },

        {
          $match: {
            $expr: {
              $eq: [{ $size: "$voteForPoll" }, 0],
            },
          },
        },

        {
          $addFields: {
            priorityScore: {
              $subtract: [
                { $ifNull: ["$maxDailyVote", 10] },
                { $ifNull: ["$dailyAssignmentCount", 0] },
              ],
            },
          },
        },

        {
          $sort: {
            priorityScore: -1,
            _id: 1,
          },
        },

        {
          $limit: limit,
        },

        {
          $project: {
            voteForPoll: 0,
            priorityScore: 0,
          },
        },

        {
          $addFields: {
            _id: { $toString: "$_id" },
            checkerId: { $toString: "$checkerId" },
            pollId: { $toString: "$pollId" },
          },
        },
      ];

      const result = await this.db.aggregateCheckers<CheckerAPI>(pipeline);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message ?? "Unknown error",
      };
    }
  }
}
