import { CheckerAPI, PollAPI, ProgrammeAPI, VoteAPI } from "@/shared/types/schema";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Filter, UpdateFilter } from "mongodb";
import { VoteFilter } from "./types";

export { DatabaseDurableObject } from "./do";

export default class extends WorkerEntrypoint<Env> {
  private getDurableObject() {
    const id = this.env.DATABASE_DURABLE_OBJECT.idFromName("mongodb-pool");
    return this.env.DATABASE_DURABLE_OBJECT.get(id);
  }

  async fetch(request: Request): Promise<Response> {
    try {
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

  async insertPoll(poll: Omit<PollAPI, "_id">, customId?: string) {
    return this.getDurableObject().insertPoll(poll, customId);
  }

  async insertChecker(checker: Omit<CheckerAPI, "_id">, customId?: string) {
    return this.getDurableObject().insertChecker(checker, customId);
  }

  async insertVote(vote: Omit<VoteAPI, "_id">, customId?: string) {
    return this.getDurableObject().insertVote(vote, customId);
  }

  async insertProgramme(programme: Omit<ProgrammeAPI, "_id">, customId?: string) {
    return this.getDurableObject().insertProgramme(programme, customId);
  }

  async findOnePoll(filter: Filter<PollAPI>) {
    return this.getDurableObject().findOnePoll(filter);
  }

  async findOneChecker(filter: Filter<CheckerAPI>) {
    return this.getDurableObject().findOneChecker(filter);
  }

  async findCheckers(filter: Filter<CheckerAPI>, options?: { sort?: Record<string, 1 | -1> }) {
    return this.getDurableObject().findCheckers(filter, options);
  }

  async findOneVote(filter: Filter<VoteAPI>) {
    return this.getDurableObject().findOneVote(filter);
  }

  async findVotes(filter: Filter<VoteAPI>) {
    return this.getDurableObject().findVotes(filter);
  }

  async findOneProgramme(filter: Filter<ProgrammeAPI>) {
    return this.getDurableObject().findOneProgramme(filter);
  }

  async findProgrammes(filter: Filter<ProgrammeAPI>, options?: { sort?: Record<string, 1 | -1> }) {
    return this.getDurableObject().findProgrammes(filter, options);
  }

  async updateOnePoll(filter: Filter<PollAPI>, update: UpdateFilter<PollAPI>) {
    return this.getDurableObject().updateOnePoll(filter, update);
  }

  async updateOneChecker(filter: Filter<CheckerAPI>, update: UpdateFilter<CheckerAPI>) {
    return this.getDurableObject().updateOneUser(filter, update);
  }

  async updateManyCheckers(filter: Filter<CheckerAPI>, update: UpdateFilter<CheckerAPI>) {
    return this.getDurableObject().updateManyUsers(filter, update);
  }

  async updateOneVote(filter: Filter<VoteAPI>, update: UpdateFilter<VoteAPI>) {
    return this.getDurableObject().updateOneVote(filter, update);
  }

  async updateOneProgramme(filter: Filter<ProgrammeAPI>, update: UpdateFilter<ProgrammeAPI>) {
    return this.getDurableObject().updateOneProgramme(filter, update);
  }

  async findCheckersWithBudget() {
    return this.getDurableObject().findCheckersWithBudget();
  }

  async findCheckersForRedistribution(pollId: string, limit: number) {
    return this.getDurableObject().findCheckersForRedistribution(pollId, limit);
  }

  async findCheckersVote(
    sortField?: string,
    offset?: number,
    limit?: number,
    baseFilter?: VoteFilter
  ) {
    return this.getDurableObject().findCheckersVote(sortField, offset, limit, baseFilter);
  }

  async getOpenPollsWithVotes(startISO: string, endISO: string, neededVotes: number) {
    return this.getDurableObject().getOpenPollsWithVotes(startISO, endISO, neededVotes);
  }

  async getVotesDetails(pollId: string, aggregationPipeline: any[]) {
    return this.getDurableObject().getVotesDetails(pollId, aggregationPipeline);
  }

  async deleteOneVote(voteId: string) {
    return this.getDurableObject().deleteOneVote(voteId);
  }

  async getLeaderboardInfo(startOfMonth: Date, startOfNextMonth: Date) {
    return this.getDurableObject().getLeaderboardInfo(startOfMonth, startOfNextMonth);
  }
}
