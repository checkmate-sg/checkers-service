import { Filter, UpdateFilter } from "mongodb";
import { CheckerAPI, VoteAPI } from "../../../types/schema";

export interface CheckerDBService {
  findTopNCheckersWithBudget(limit: number): Promise<{
    success: boolean;
    data?: CheckerAPI[];
    error?: string;
  }>;

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
    vote: Omit<VoteAPI, "_id">,
    customId?: string
  ): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }>;

  updateOneChecker(
    filter: Filter<CheckerAPI>,
    update: UpdateFilter<CheckerAPI>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    error?: string;
  }>;

  updateOneVote(
    filter: Filter<VoteAPI>,
    update: UpdateFilter<VoteAPI>
  ): Promise<{
    success: boolean;
    modifiedCount?: number;
    previousDocument?: VoteAPI;
    error?: string;
  }>;
}
