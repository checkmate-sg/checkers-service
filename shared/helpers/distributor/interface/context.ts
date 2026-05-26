import { CheckerAPI, Vote } from "@/shared/types/schema";
import { DistributionStep } from "./step";
import { DistributionStatus } from "./status";

export interface DistributionContext {
  checker: CheckerAPI;

  pollId: string;

  pollText?: string | null;
  pollImageUrl?: string | null;

  vote: Omit<Vote, "_id">;

  voteId?: string;
  telegramMsgId?: number;

  step: DistributionStep;
  status: DistributionStatus;

  error?: string;
  createdAt: Date;
  updatedAt?: Date;
}
