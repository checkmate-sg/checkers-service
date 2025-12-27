import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
/**
 * Database Service Worker with Durable Objects for Connection Pooling
 *
 * This worker handles database operations for the Checkmate application.
 * Uses Durable Objects to maintain persistent MongoDB connections for improved performance.
 */
import { Filter, MongoClient, ObjectId, UpdateFilter } from 'mongodb';

import {
  Checker,
  CheckerAPI,
  Leaderboard,
  LeaderboardAPI,
  Poll,
  PollAPI,
  Vote,
  VoteAPI
} from '@/shared/types/schema';

import { VoteFilter } from './types';

const DB_NAME = "checkmate-checkers-app";

/**
 * DatabaseDurableObject maintains a persistent MongoDB connection
 * This significantly improves performance by avoiding connection overhead
 */
export class DatabaseDurableObject extends DurableObject<Env> {
  private client: MongoClient;
  private connectPromise: Promise<MongoClient>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.client = new MongoClient(env.MONGODB_CONNECTION_STRING);
    // Store the connection promise to await in each method
    this.connectPromise = this.client.connect();
  }

  /**
   * Helper method to convert string IDs to ObjectIds in filter objects
   * This ensures proper querying when string IDs are passed from the NextJS app
   */
  private convertStringIdsToObjectIds(filter: any): any {
    if (!filter || typeof filter !== "object") {
      return filter;
    }

    const convertedFilter = { ...filter };

    // Convert common ID fields from string to ObjectId
    if (typeof convertedFilter._id === "string") {
      convertedFilter._id = new ObjectId(convertedFilter._id);
    }
    if (typeof convertedFilter.pollId === "string") {
      convertedFilter.pollId = new ObjectId(convertedFilter.pollId);
    }
    if (typeof convertedFilter.checkerId === "string") {
      convertedFilter.checkerId = new ObjectId(convertedFilter.checkerId);
    }
    // checkId is kept as string (external system ID, not MongoDB ObjectId)

    // Handle nested objects (like $set, $push, etc.)
    Object.keys(convertedFilter).forEach(key => {
      if (key.startsWith("$") && typeof convertedFilter[key] === "object") {
        convertedFilter[key] = this.convertStringIdsToObjectIds(convertedFilter[key]);
      }
    });

    return convertedFilter;
  }

  async insertPoll(
    poll: Omit<Poll, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const pollsCollection = db.collection("polls");

      const objectId = customId ? new ObjectId(customId) : new ObjectId();
      const idString = objectId.toString();

      await pollsCollection.insertOne({
        ...poll,
        _id: objectId,
        // checkId kept as string (external system ID)
      });

      return { success: true, id: idString };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, poll }, "Failed to insert poll");
      return { success: false, error: errorMessage };
    }
  }

  async insertChecker(
    user: Omit<Checker, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const checkersCollection = db.collection("checkers");

      const objectId = customId ? new ObjectId(customId) : new ObjectId();
      const idString = objectId.toString();

      await checkersCollection.insertOne({
        ...user,
        _id: objectId,
      });

      return { success: true, id: idString };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, user }, "Failed to insert user");
      return { success: false, error: errorMessage };
    }
  }

  async insertVote(
    vote: Omit<Vote, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votesCollection = db.collection("votes");

      const objectId = customId ? new ObjectId(customId) : new ObjectId();
      const idString = objectId.toString();

      // Convert string IDs to ObjectIds
      const voteData = {
        ...vote,
        _id: objectId,
        pollId: typeof vote.pollId === "string" ? new ObjectId(vote.pollId) : vote.pollId,
        checkerId:
          typeof vote.checkerId === "string" ? new ObjectId(vote.checkerId) : vote.checkerId,
      };

      await votesCollection.insertOne(voteData);

      return { success: true, id: idString };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, vote }, "Failed to insert vote");
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
      const votesCollection = db.collection<Vote>("votes");

      const baseMatch: any = { checkerId: new ObjectId(baseFilter.checkerId) };
      if (baseFilter?.voteCheckerStatus === true) {
        // Means voted
        baseMatch.votedTimestamp = { $ne: null };
        baseMatch.category = { $ne: null };
      } else if (baseFilter?.voteCheckerStatus === false) {
        // Means not voted
        baseMatch.votedTimestamp = null;
        baseMatch.category = null;
      }

      const basePipeline: any[] = [{ $match: baseMatch }];

      // Determine sort field - default to poll.startedTimestamp if not provided
      let sortFieldToUse = "poll.startedTimestamp";
      if (sortField === "createdTimestamp") {
        sortFieldToUse = "createdTimestamp";
      } else if (sortField === "votedTimestamp") {
        sortFieldToUse = "votedTimestamp";
      }

      const aggregationPipeline: any[] = [
        {
          $lookup: {
            from: "polls",
            localField: "pollId",
            foreignField: "_id",
            as: "poll",
          },
        },
        {
          $unwind: {
            path: "$poll",
            preserveNullAndEmptyArrays: false,
          },
        },
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
            poll: {
              _id: { $toString: "$poll._id" },
              checkId: {
                $toString: "$poll.checkId",
              },
              text: "$poll.text",
              imageUrl: "$poll.imageURl",
              caption: "$poll.caption",
              longformResponse: "$poll.longformResponse",
              crowdSourcedCategory: "$poll.crowdSourcedCategory",
              shortformResponse: "$poll.shortformResponse",
              startedTimestamp: "$poll.startedTimestamp",
              assessedTimestamp: "$poll.assessedTimestamp",
            },
          },
        },
        {
          $sort: {
            [sortFieldToUse]: -1,
            _id: -1,
          },
        },
        { $skip: offset },
        { $limit: limit },
      ];

      const voteChecker = await votesCollection.aggregate(basePipeline).toArray();
      const voteCheckerCount = voteChecker.length;


      const pipeline = [...basePipeline, ...aggregationPipeline];

      const voteCheckerResult = await votesCollection.aggregate(pipeline).toArray();

      // console.log(voteCheckerResult);

      if (!voteCheckerResult) {
        return { success: true, data: undefined, total: voteCheckerCount };
      }

      return { success: true, data: voteCheckerResult, total: voteCheckerCount };
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
      const votesCollection = db.collection<Vote>("votes");

      // pollId is stored as ObjectId, convert string to ObjectId for matching
      const basePipeline = [
        {
          $match: {
            pollId: new ObjectId(pollId),
          },
        },
      ];

      const completePipeline = [...basePipeline, ...aggregationPipeline];

      const countVotes = await votesCollection.aggregate(completePipeline).toArray();

      return {
        success: true,
        data: countVotes,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage }, "Failed to count votes category");
      return { success: false, error: errorMessage };
    }
  }

  async updateOnePoll(
    filter: Filter<Poll>,
    update: UpdateFilter<Poll>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    previousDocument?: PollAPI;
    error?: string;
  }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const pollsCollection = db.collection<Poll>("polls");

      // Convert string IDs to ObjectIds in both filter and update
      const processedFilter = this.convertStringIdsToObjectIds(filter);
      const processedUpdate = this.convertStringIdsToObjectIds(update);

      // Use findOneAndUpdate to get the previous document for change detection
      const result = await pollsCollection.findOneAndUpdate(processedFilter, processedUpdate, {
        returnDocument: "before",
      });

      // Convert ObjectIds to strings if document was found
      const previousDocument = result
        ? {
            ...result,
            _id: result._id?.toString(),
            checkId: result.checkId?.toString(),
          }
        : undefined;

      return {
        success: true,
        modifiedCount: result ? 1 : 0,
        previousDocument: previousDocument as PollAPI | undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update poll");
      return { success: false, error: errorMessage };
    }
  }

  async updateOneUser(
    filter: Filter<Checker>,
    update: UpdateFilter<Checker>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const checkersCollection = db.collection<Checker>("checkers");

      // Convert string IDs to ObjectIds in both filter and update
      const processedFilter = this.convertStringIdsToObjectIds(filter);
      const processedUpdate = this.convertStringIdsToObjectIds(update);

      const result = await checkersCollection.updateOne(processedFilter, processedUpdate);

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update user");
      return { success: false, error: errorMessage };
    }
  }

  async updateOneVote(
    filter: Filter<Vote>,
    update: UpdateFilter<Vote>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votesCollection = db.collection<Vote>("votes");

      // Convert string IDs to ObjectIds in both filter and update
      const processedFilter = this.convertStringIdsToObjectIds(filter);
      const processedUpdate = this.convertStringIdsToObjectIds(update);

      const result = await votesCollection.updateOne(processedFilter, processedUpdate);

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter, update }, "Failed to update vote");
      return { success: false, error: errorMessage };
    }
  }

  async findOneChecker(
    filter: Filter<Checker>
  ): Promise<{ success: boolean; data?: CheckerAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const checkersCollection = db.collection<Checker>("checkers");

      // Convert string _id to ObjectId if present
      const processedFilter = this.convertStringIdsToObjectIds(filter);

      const checker = await checkersCollection.findOne(processedFilter);

      if (!checker) {
        return { success: true, data: undefined };
      }

      // Convert ObjectId to string before returning
      const checkerWithStringId = {
        ...checker,
        _id: checker._id?.toString(),
      };

      return { success: true, data: checkerWithStringId as CheckerAPI };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find checker");
      return { success: false, error: errorMessage };
    }
  }

  async findCheckers(
    filter: Filter<Checker>,
    options?: {
      sort?: Record<string, 1 | -1>; // e.g. { dailyAssignmentCount: 1}
    }
  ): Promise<{ success: boolean; data?: CheckerAPI[]; error?: string; total?: number }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const checkersCollection = db.collection<Checker>("checkers");

      // Convert string _id to ObjectId if present
      const processedFilter = this.convertStringIdsToObjectIds(filter);

      // Checker[]
      let findCheckers = await checkersCollection.find(processedFilter);

      if (options?.sort) {
        findCheckers = findCheckers.sort(options.sort);
      }

      const checkers = await findCheckers.toArray();

      if (!checkers) {
        return { success: true, data: undefined };
      }

      // Convert ObjectId to string before returning
      const checkersWithStringId = checkers.map(checker => ({
        ...checker,
        _id: checker._id?.toString(),
      }));

      const totalCheckers = checkersWithStringId.length;

      return { success: true, data: checkersWithStringId as CheckerAPI[], total: totalCheckers };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find checker");
      return { success: false, error: errorMessage };
    }
  }

  async findOnePoll(
    filter: Filter<Poll>
  ): Promise<{ success: boolean; data?: PollAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const pollsCollection = db.collection<Poll>("polls");

      // Convert string _id to ObjectId if present
      const processedFilter = this.convertStringIdsToObjectIds(filter);

      const poll = await pollsCollection.findOne(processedFilter);

      if (poll === null) {
        return { success: true, data: undefined };
      }

      // Convert ObjectId to string before returning
      const pollWithStringId = {
        ...poll,
        _id: poll._id?.toString(),
        checkId: poll.checkId?.toString(),
      };

      return { success: true, data: pollWithStringId as PollAPI };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find poll");
      return { success: false, error: errorMessage };
    }
  }

  async findOneVote(
    filter: Filter<Vote>
  ): Promise<{ success: boolean; data?: VoteAPI; error?: string }> {
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votesCollection = db.collection<Vote>("votes");

      // Convert string IDs to ObjectIds if present
      const processedFilter = this.convertStringIdsToObjectIds(filter);

      const vote = await votesCollection.findOne(processedFilter);

      if (!vote) {
        return { success: true, data: undefined };
      }

      // Convert ObjectIds to strings before returning
      const voteWithStringIds = {
        ...vote,
        _id: vote._id?.toString(),
        pollId: vote.pollId?.toString(),
        checkerId: vote.checkerId?.toString(),
      };

      return { success: true, data: voteWithStringIds as VoteAPI };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage, filter }, "Failed to find vote");
      return { success: false, error: errorMessage };
    }
  }

  async getLeaderboardInfo(
    startOfMonth: Date,
    startOfNextMonth: Date
  ): Promise<{ success: boolean, data?: LeaderboardAPI[], total?: number, error?: string}>{
    try {
      await this.connectPromise;
      const db = this.client.db(DB_NAME);
      const votesCollection = db.collection<Vote>("votes");

      const aggregationPipeline = [
        {
          // Step 1: Filter by currrent month 
          $match: {
            votedTimestamp: {
              $gte: startOfMonth, 
              $lt: startOfNextMonth 
            }
          }
        }, 
        {
          // Step 2: Group by checkerId and calculate metrics 
          $group: {
            _id: "$checkerId",
            numberOfVotes: { $sum: 1 },
            totalScore: { $sum: "$score" },
            averageResponseTime: { $avg: "$responseTime" },
            correctVotes: {
              $sum: {
                $cond: [{ $eq: ["$isCorrect", true]}, 1, 0]
              }
            }
          }
        },
        {
          // Step 3: Calculate accuracy percentage 
          $addFields: {
            accuracy: {
              $multiply: [
                { $divide: ["$correctVotes", "$numberOfVotes"] },
                100
              ]
            }
          }
        },
        {
          // Step 4: Lookup checker details from checkers collection 
          $lookup: {
            from: "checkers",
            localField: "_id",
            foreignField: "_id",
            as: "checkerInfo"
          }
        },
        {
          // Step 5: Unwind the checkerInfo array 
          $unwind: {
            path: "$checkerInfo",
            preserveNullAndEmptyArrays: true
          }
        },
        {
          // Step 6: Project final output with desired fields 
          $project: {
            _id: 1, 
            checkerName: "$checkerInfo.name",
            numberOfVotes: 1, 
            totalScore: 1, 
            averageResponseTime: 1,
            accuracy: { $round: ["$accuracy", 2]}, // Round to 2d.p
            correctVotes: 1
          }
        },
        {
          // Step 7: sort by total scores (descending)
          $sort: {totalScore: -1}
        }
      ]

      const results = await votesCollection.aggregate<Leaderboard>(aggregationPipeline).toArray();

      if (!results) {
        return { success: true, data: undefined, total: results.length };
      }

      // Convert ObjectId to string before returning
      const resultsWithStringId = results.map(result => ({
        ...result, 
        _id: result._id?.toString()
      }))

      return { success: true, data: resultsWithStringId, total: results.length };


    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error({ error, errorMessage }, "Failed to fetch leaderboard statistics");
      return { success: false, error: errorMessage };
    }

  }
}

export default class extends WorkerEntrypoint<Env> {
  // Get or create a Durable Object instance
  private getDurableObject() {
    // Use a consistent ID for the database connection pool
    const id = this.env.DATABASE_DURABLE_OBJECT.idFromName("mongodb-pool");
    return this.env.DATABASE_DURABLE_OBJECT.get(id);
  }

  async fetch(request: Request): Promise<Response> {
    try {
      // Simple health check endpoint
      return new Response(JSON.stringify({ status: "healthy", service: "database-service" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error({ error }, "Error handling health check request");
      return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  async insertPoll(poll: Omit<Poll, "_id">, customId?: string) {
    const durableObject = this.getDurableObject();
    return durableObject.insertPoll(poll, customId);
  }

  async insertChecker(checker: Omit<Checker, "_id">, customId?: string) {
    const durableObject = this.getDurableObject();
    return durableObject.insertChecker(checker, customId);
  }

  async insertVote(vote: Omit<Vote, "_id">, customId?: string) {
    const durableObject = this.getDurableObject();
    return durableObject.insertVote(vote, customId);
  }

  async updateOnePoll(filter: Filter<Poll>, update: UpdateFilter<Poll>) {
    const durableObject = this.getDurableObject();
    return durableObject.updateOnePoll(filter, update);
  }

  async findCheckersVote(sortField?: string, offset?: number, limit?: number, baseFilter?: any) {
    const durableObject = this.getDurableObject();
    return durableObject.findCheckersVote(sortField, offset, limit, baseFilter);
  }

  async getVotesDetails(pollId: string, aggregationPipeline: any[]) {
    const durableObject = this.getDurableObject();
    return durableObject.getVotesDetails(pollId, aggregationPipeline);
  }

  async updateOneChecker(filter: Filter<Checker>, update: UpdateFilter<Checker>) {
    const durableObject = this.getDurableObject();
    return durableObject.updateOneUser(filter, update);
  }

  async updateOneVote(filter: Filter<Vote>, update: UpdateFilter<Vote>) {
    const durableObject = this.getDurableObject();
    return durableObject.updateOneVote(filter, update);
  }

  async findOneChecker(filter: Filter<Checker>) {
    const durableObject = this.getDurableObject();
    return durableObject.findOneChecker(filter);
  }

  async findCheckers(
    filter: Filter<Checker>,
    options?: {
      sort?: Record<string, 1 | -1>; // e.g. { dailyAssignmentCount: 1}
    }
  ) {
    const durableObject = this.getDurableObject();
    return durableObject.findCheckers(filter, options);
  }

  async findOnePoll(filter: Filter<Poll>) {
    const durableObject = this.getDurableObject();
    return durableObject.findOnePoll(filter);
  }

  async findOneVote(filter: Filter<Vote>) {
    const durableObject = this.getDurableObject();
    return durableObject.findOneVote(filter);
  }

  async getLeaderboardInfo(
    startOfMonth: Date,
    startOfNextMonth: Date
  ) {
    const durableObject = this.getDurableObject();
    return durableObject.getLeaderboardInfo(startOfMonth, startOfNextMonth)
  }
}
