import { Filter, UpdateFilter } from "mongodb";
import { Vote, CheckerAPI, VoteAPI, Checker } from "../../../types/schema";

export interface CheckerDBService {
  findCheckersWithBudget(): Promise<{
    success: boolean;
    data?: CheckerAPI[];
    error?: string;
  }>;

  deleteOneVote(voteId: string): Promise<{
    success: boolean;
    deletedCount?: number;
    error?: string;
  }>;

  findCheckersForRedistribution(
    pollId: string,
    limit: number
  ): Promise<{
    success: boolean;
    data?: CheckerAPI[];
    error?: string;
  }>;

  insertVote(
    vote: Omit<Vote, "_id">,
    customId?: string
  ): Promise<{
    success: boolean;
    id?: string;
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

  updateOneVote(
    filter: Filter<Vote>,
    update: UpdateFilter<Vote>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    previousDocument?: VoteAPI;
    error?: string;
  }>;
}
