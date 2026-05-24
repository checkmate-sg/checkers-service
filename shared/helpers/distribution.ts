import { ObjectId, Filter, UpdateFilter, type Document } from "mongodb";
import { Vote, CheckerAPI, VoteAPI, Checker } from "../types/schema";
import { Bot, InlineKeyboard } from "grammy";

export interface CheckerAggregationService {
  getValidCheckers(
    pollId: string,
    limit: number
  ): Promise<{
    success: boolean;
    data?: CheckerAPI[];
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
    modifiedCount?: number;
    error?: string;
  }>;

  deleteOneVote(filter: Filter<Vote>): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }>;

  updateOneChecker(
    filter: Filter<Checker>,
    update: UpdateFilter<Checker>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    error?: string;
  }>;
}

interface DistributionLoad {
  pollId: string;
  text?: string | null;
  imageUrl?: string | null;
  limit: number;
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

  public async distribute(load: DistributionLoad) {
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
        return this.processOneVote(checker, v, previewText);
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
    previewText: string
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
      // Await the bookkeeping writes so they complete within the request /
      // cron lifetime. postVoteUpdate uses Promise.allSettled and swallows
      // its own errors, so a failed bookkeeping write still won't fail the vote.
      await this.postVoteUpdate(checker, voteId, sentMsg.message_id);
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

  private postVoteUpdate(checker: CheckerAPI, voteId: string, messageId: number) {
    const checkerUpdate = this.db
      .updateOneChecker(
        { _id: checker._id as any },
        {
          $inc: { dailyAssignmentCount: 1 },
        }
      )
      .catch(err => {
        console.error(`checker assignment update failed ${checker._id}`, err);
      });

    const voteUpdate = this.db
      .updateOneVote({ _id: voteId as any }, { $set: { telegramMessageId: messageId } })
      .catch(err => {
        console.error(`telegram update failed vote ${voteId}`, err);
      });

    return Promise.allSettled([checkerUpdate, voteUpdate]);
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

  private async getValidCheckers(pollId: string, limit: number) {
    return this.db.getValidCheckers(pollId, limit);
  }
}
