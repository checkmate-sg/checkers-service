import { DurableObject } from "cloudflare:workers";
import { Filter, MongoClient, ObjectId, UpdateFilter } from "mongodb";

import {
  CheckerAPI,
  Leaderboard,
  LeaderboardAPI,
  PollAPI,
  ProgrammeAPI,
  VoteAPI,
} from "@/shared/types/schema";

import { VoteFilter } from "./types";

const DB_NAME = "checkmate-checkers-app";

export class DatabaseDurableObject extends DurableObject<Env> {
  private client: MongoClient;
  private connectPromise: Promise<MongoClient>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.client = new MongoClient(env.MONGODB_CONNECTION_STRING);
    this.connectPromise = this.client.connect();
  }

  private toObjectId(id: string | undefined | null): ObjectId | null {
    if (!id) return null;
    return new ObjectId(id);
  }

  async insertPoll(
    poll: Omit<PollAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const objectId = customId ? new ObjectId(customId) : new ObjectId();

      await db.collection("polls").insertOne({
        ...poll,
        _id: objectId,
        // checkId kept as string (external system ID)
      });

      return { success: true, id: objectId.toString() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, poll }, "Failed to insert poll");
      return { success: false, error: errorMessage };
    }
  }

  async insertChecker(
    checker: Omit<CheckerAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const objectId = customId ? new ObjectId(customId) : new ObjectId();

      await db.collection("checkers").insertOne({
        ...checker,
        _id: objectId,
        currentProgrammeId: checker.currentProgrammeId
          ? new ObjectId(checker.currentProgrammeId)
          : null,
      });

      return { success: true, id: objectId.toString() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, checker }, "Failed to insert checker");
      return { success: false, error: errorMessage };
    }
  }

  async insertVote(
    vote: Omit<VoteAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const objectId = customId ? new ObjectId(customId) : new ObjectId();

      await db.collection("votes").insertOne({
        ...vote,
        _id: objectId,
        pollId: new ObjectId(vote.pollId),
        checkerId: new ObjectId(vote.checkerId),
      });

      return { success: true, id: objectId.toString() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, vote }, "Failed to insert vote");
      return { success: false, error: errorMessage };
    }
  }

  async insertProgramme(
    programme: Omit<ProgrammeAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const objectId = customId ? new ObjectId(customId) : new ObjectId();

      await db.collection("programmes").insertOne({
        ...programme,
        _id: objectId,
        checkerId: new ObjectId(programme.checkerId),
      });

      return { success: true, id: objectId.toString() };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, programme }, "Failed to insert programme");
      return { success: false, error: errorMessage };
    }
  }

  async findOnePoll(
    filter: Filter<PollAPI>
  ): Promise<{ success: boolean; data?: PollAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const poll = await db.collection("polls").findOne(this.convertFilter(filter));

      if (!poll) return { success: true, data: undefined };

      return {
        success: true,
        data: { ...poll, _id: poll._id.toString(), checkId: poll.checkId?.toString() } as PollAPI,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find poll");
      return { success: false, error: errorMessage };
    }
  }

  async findOneChecker(
    filter: Filter<CheckerAPI>
  ): Promise<{ success: boolean; data?: CheckerAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const checker = await db.collection("checkers").findOne(this.convertFilter(filter));

      if (!checker) return { success: true, data: undefined };

      return {
        success: true,
        data: {
          ...checker,
          _id: checker._id.toString(),
          currentProgrammeId: checker.currentProgrammeId?.toString() ?? null,
        } as CheckerAPI,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find checker");
      return { success: false, error: errorMessage };
    }
  }

  async findCheckers(
    filter: Filter<CheckerAPI>,
    options?: { sort?: Record<string, 1 | -1> }
  ): Promise<{ success: boolean; data?: CheckerAPI[]; error?: string; total?: number }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      let cursor = db.collection("checkers").find(this.convertFilter(filter));

      if (options?.sort) cursor = cursor.sort(options.sort);

      const checkers = await cursor.toArray();
      const data = checkers.map(c => ({
        ...c,
        _id: c._id.toString(),
        currentProgrammeId: c.currentProgrammeId?.toString() ?? null,
      })) as CheckerAPI[];

      return { success: true, data, total: data.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find checkers");
      return { success: false, error: errorMessage };
    }
  }

  async findOneVote(
    filter: Filter<VoteAPI>
  ): Promise<{ success: boolean; data?: VoteAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const vote = await db.collection("votes").findOne(this.convertFilter(filter));

      if (!vote) return { success: true, data: undefined };

      return {
        success: true,
        data: {
          ...vote,
          _id: vote._id.toString(),
          pollId: vote.pollId.toString(),
          checkerId: vote.checkerId.toString(),
        } as VoteAPI,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find vote");
      return { success: false, error: errorMessage };
    }
  }

  async findVotes(
    filter: Filter<VoteAPI>
  ): Promise<{ success: boolean; data?: VoteAPI[]; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votes = await db.collection("votes").find(this.convertFilter(filter)).toArray();

      const data = votes.map(v => ({
        ...v,
        _id: v._id.toString(),
        pollId: v.pollId.toString(),
        checkerId: v.checkerId.toString(),
      })) as VoteAPI[];

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find votes");
      return { success: false, error: errorMessage };
    }
  }

  async findOneProgramme(
    filter: Filter<ProgrammeAPI>
  ): Promise<{ success: boolean; data?: ProgrammeAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const programme = await db.collection("programmes").findOne(this.convertFilter(filter));

      if (!programme) return { success: true, data: undefined };

      return {
        success: true,
        data: {
          ...programme,
          _id: programme._id.toString(),
          checkerId: programme.checkerId.toString(),
        } as ProgrammeAPI,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find programme");
      return { success: false, error: errorMessage };
    }
  }

  async findProgrammes(
    filter: Filter<ProgrammeAPI>,
    options?: { sort?: Record<string, 1 | -1> }
  ): Promise<{ success: boolean; data?: ProgrammeAPI[]; error?: string; total?: number }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      let cursor = db.collection("programmes").find(this.convertFilter(filter));

      if (options?.sort) cursor = cursor.sort(options.sort);

      const programmes = await cursor.toArray();
      const data = programmes.map(p => ({
        ...p,
        _id: p._id.toString(),
        checkerId: p.checkerId.toString(),
      })) as ProgrammeAPI[];

      return { success: true, data, total: data.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find programmes");
      return { success: false, error: errorMessage };
    }
  }

  async updateOnePoll(
    filter: Filter<PollAPI>,
    update: UpdateFilter<PollAPI>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    previousDocument?: PollAPI;
    error?: string;
  }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("polls")
        .findOneAndUpdate(this.convertFilter(filter), this.convertUpdate(update), {
          returnDocument: "before",
        });

      return {
        success: true,
        modifiedCount: result ? 1 : 0,
        previousDocument: result
          ? ({
              ...result,
              _id: result._id.toString(),
              checkId: result.checkId?.toString(),
            } as PollAPI)
          : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update poll");
      return { success: false, error: errorMessage };
    }
  }

  async updateOneUser(
    filter: Filter<CheckerAPI>,
    update: UpdateFilter<CheckerAPI>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("checkers")
        .updateOne(this.convertFilter(filter), this.convertUpdate(update));

      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update checker");
      return { success: false, error: errorMessage };
    }
  }

  async updateManyUsers(
    filter: Filter<CheckerAPI>,
    update: UpdateFilter<CheckerAPI>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("checkers")
        .updateMany(this.convertFilter(filter), this.convertUpdate(update));

      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to bulk update checkers");
      return { success: false, error: errorMessage };
    }
  }

  async updateOneVote(
    filter: Filter<VoteAPI>,
    update: UpdateFilter<VoteAPI>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    previousDocument?: VoteAPI;
    error?: string;
  }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("votes")
        .findOneAndUpdate(this.convertFilter(filter), this.convertUpdate(update), {
          returnDocument: "before",
        });

      return {
        success: true,
        modifiedCount: result ? 1 : 0,
        previousDocument: result
          ? ({
              ...result,
              _id: result._id.toString(),
              pollId: result.pollId.toString(),
              checkerId: result.checkerId.toString(),
            } as VoteAPI)
          : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update vote");
      return { success: false, error: errorMessage };
    }
  }

  async updateOneProgramme(
    filter: Filter<ProgrammeAPI>,
    update: UpdateFilter<ProgrammeAPI>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("programmes")
        .updateOne(this.convertFilter(filter), this.convertUpdate(update));

      return { success: true, modifiedCount: result.modifiedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update programme");
      return { success: false, error: errorMessage };
    }
  }

  async deleteOneVote(
    voteId: string
  ): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);

      if (!ObjectId.isValid(voteId)) {
        return { success: false, error: `Invalid vote id received: ${voteId}` };
      }

      const result = await db.collection("votes").deleteOne({ _id: new ObjectId(voteId) });

      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, voteId }, `Failed to delete vote by id: ${voteId}`);
      return { success: false, error: errorMessage };
    }
  }

  async findCheckersVote(
    sortField?: string,
    offset?: number,
    limit?: number,
    baseFilter?: VoteFilter
  ): Promise<{ success: boolean; data?: any; total?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votesCollection = db.collection("votes");

      if (!baseFilter?.checkerId || !ObjectId.isValid(baseFilter.checkerId)) {
        return { success: false, error: `Invalid checkerId: ${baseFilter?.checkerId}` };
      }

      const baseMatch: any = { checkerId: new ObjectId(baseFilter.checkerId) };
      if (baseFilter.voteCheckerStatus === true) {
        baseMatch.votedTimestamp = { $ne: null };
        baseMatch.category = { $ne: null };
      } else if (baseFilter.voteCheckerStatus === false) {
        baseMatch.votedTimestamp = null;
        baseMatch.category = null;
      }

      const basePipeline: any[] = [{ $match: baseMatch }];

      let sortFieldToUse = "poll.startedTimestamp";
      if (sortField === "createdTimestamp") sortFieldToUse = "createdTimestamp";
      else if (sortField === "votedTimestamp") sortFieldToUse = "votedTimestamp";

      const aggregationPipeline: any[] = [
        { $lookup: { from: "polls", localField: "pollId", foreignField: "_id", as: "poll" } },
        { $unwind: { path: "$poll", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            _id: 0,
            voteId: { $toString: "$_id" },
            pollId: { $toString: "$pollId" },
            checkerId: { $toString: "$checkerId" },
            createdTimestamp: 1,
            votedTimestamp: 1,
            category: 1,
            truthScore: 1,
            responseCategory: 1,
            commentOnResponse: 1,
            isCorrect: 1,
            poll: {
              _id: { $toString: "$poll._id" },
              checkId: { $toString: "$poll.checkId" },
              text: "$poll.text",
              imageUrl: "$poll.imageUrl",
              caption: "$poll.caption",
              longformResponse: "$poll.longformResponse",
              crowdSourcedCategory: "$poll.crowdSourcedCategory",
              shortformResponse: "$poll.shortformResponse",
              startedTimestamp: "$poll.startedTimestamp",
              assessedTimestamp: "$poll.assessedTimestamp",
            },
          },
        },
        { $sort: { [sortFieldToUse]: -1, _id: -1 } },
        { $skip: offset },
        { $limit: limit },
      ];

      const total = await votesCollection.aggregate(basePipeline).toArray();
      const data = await votesCollection
        .aggregate([...basePipeline, ...aggregationPipeline])
        .toArray();

      return { success: true, data: data ?? undefined, total: total.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage }, "Failed to find checker's votes");
      return { success: false, error: errorMessage };
    }
  }

  async getVotesDetails(
    pollId: string,
    aggregationPipeline: any[]
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const result = await db
        .collection("votes")
        .aggregate([{ $match: { pollId: new ObjectId(pollId) } }, ...aggregationPipeline])
        .toArray();

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage }, "Failed to get votes details");
      return { success: false, error: errorMessage };
    }
  }

  async getOpenPollsWithVotes(
    startISO: string,
    endISO: string,
    neededVotes: number
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);

      const pipeline = [
        {
          $match: {
            assessedTimestamp: null,
            startedTimestamp: { $gte: new Date(startISO), $lt: new Date(endISO) },
          },
        },
        { $lookup: { from: "votes", localField: "_id", foreignField: "pollId", as: "votes" } },
        {
          $addFields: {
            totalVotes: { $size: "$votes" },
            completedVotes: {
              $size: {
                $filter: { input: "$votes", as: "v", cond: { $ne: ["$$v.votedTimestamp", null] } },
              },
            },
          },
        },
        { $match: { completedVotes: { $lt: neededVotes } } },
        { $project: { votes: 0 } },
      ];

      const result = await db.collection("polls").aggregate(pipeline).toArray();
      return { success: true, data: JSON.parse(JSON.stringify(result)) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async findCheckersForRedistribution(
    pollId: string,
    limit: number
  ): Promise<{ success: boolean; data?: CheckerAPI[]; error?: string }> {
    try {
      await this.connectPromise;

      if (!ObjectId.isValid(pollId)) {
        return { success: false, error: `Invalid pollId: ${pollId}` };
      }

      const db = this.client.db(DB_NAME);
      const pollObjectId = new ObjectId(pollId);

      const pipeline = [
        { $match: { isActive: true, onboardingStatus: "completed" } },
        {
          $lookup: {
            from: "votes",
            let: { checkerId: "$_id", pollId: pollObjectId },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$checkerId", "$$checkerId"] },
                      { $eq: ["$pollId", "$$pollId"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "voteForPoll",
          },
        },
        { $match: { "voteForPoll.0": { $exists: false } } },
        {
          $addFields: {
            remainingCapacity: {
              $subtract: [
                { $ifNull: ["$maxDailyVotes", 10] },
                { $ifNull: ["$dailyAssignmentCount", 0] },
              ],
            },
          },
        },
        { $sort: { remainingCapacity: -1 } },
        { $limit: limit },
        { $project: { voteForPoll: 0, remainingCapacity: 0 } },
        {
          $addFields: {
            _id: { $toString: "$_id" },
            currentProgrammeId: { $toString: "$currentProgrammeId" },
          },
        },
      ];

      const result = await db.collection("checkers").aggregate(pipeline).toArray();
      return { success: true, data: JSON.parse(JSON.stringify(result)) as CheckerAPI[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async findCheckersWithBudget(): Promise<{
    success: boolean;
    data?: CheckerAPI[];
    error?: string;
  }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);

      const pipeline = [
        {
          $match: {
            isActive: true,
            onboardingStatus: "completed",
            $expr: {
              $lt: [{ $ifNull: ["$dailyAssignmentCount", 0] }, { $ifNull: ["$maxTarget", 10] }],
            },
          },
        },
        {
          $addFields: {
            _id: { $toString: "$_id" },
            currentProgrammeId: { $toString: "$currentProgrammeId" },
          },
        },
      ];

      const result = await db.collection("checkers").aggregate(pipeline).toArray();
      return { success: true, data: JSON.parse(JSON.stringify(result)) as CheckerAPI[] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  async getLeaderboardInfo(
    startOfMonth: Date,
    startOfNextMonth: Date
  ): Promise<{ success: boolean; data?: LeaderboardAPI[]; total?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);

      const pipeline = [
        {
          $match: {
            createdTimestamp: { $gte: startOfMonth, $lt: startOfNextMonth },
            votedTimestamp: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$checkerId",
            numberOfVotes: { $sum: 1 },
            totalScore: { $sum: "$score" },
            averageResponseTime: { $avg: "$responseTime" },
            correctVotes: { $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] } },
          },
        },
        {
          $addFields: {
            accuracy: { $multiply: [{ $divide: ["$correctVotes", "$numberOfVotes"] }, 100] },
          },
        },
        {
          $lookup: { from: "checkers", localField: "_id", foreignField: "_id", as: "checkerInfo" },
        },
        { $unwind: { path: "$checkerInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            checkerName: "$checkerInfo.name",
            numberOfVotes: 1,
            totalScore: 1,
            averageResponseTime: 1,
            accuracy: { $round: ["$accuracy", 2] },
            correctVotes: 1,
          },
        },
        { $sort: { totalScore: -1 } },
      ];

      const results = await db.collection("votes").aggregate<Leaderboard>(pipeline).toArray();
      const data = results.map(r => ({ ...r, _id: r._id?.toString() }));

      return { success: true, data, total: data.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage }, "Failed to fetch leaderboard statistics");
      return { success: false, error: errorMessage };
    }
  }

  private convertFilter(filter: any): any {
    if (!filter || typeof filter !== "object") return filter;

    const converted = { ...filter };

    if (typeof converted._id === "string") converted._id = new ObjectId(converted._id);
    if (typeof converted.pollId === "string") converted.pollId = new ObjectId(converted.pollId);
    if (typeof converted.checkerId === "string")
      converted.checkerId = new ObjectId(converted.checkerId);
    if (typeof converted.currentProgrammeId === "string")
      converted.currentProgrammeId = new ObjectId(converted.currentProgrammeId);

    Object.keys(converted).forEach(key => {
      if (key.startsWith("$") && typeof converted[key] === "object") {
        converted[key] = this.convertFilter(converted[key]);
      }
    });

    return converted;
  }

  private convertUpdate(update: any): any {
    if (!update || typeof update !== "object") return update;

    const converted = { ...update };

    Object.keys(converted).forEach(key => {
      if (key.startsWith("$") && typeof converted[key] === "object") {
        converted[key] = this.convertFilter(converted[key]);
      }
    });

    return converted;
  }
}
