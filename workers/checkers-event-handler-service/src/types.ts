import { Bot } from "grammy";

// Checker API type from database
export interface CheckerAPI {
  _id: string;
  name: string | null;
  telegramId: string;
  whatsappId: string | null;
  singpassId: null;
  isActive: boolean;
  isOnboardingComplete: boolean;
  onboardingTime: Date | null;
  isQuizComplete: boolean;
  quizScore: number | null;
  onboardingStatus:
    | "name"
    | "number"
    | "verify"
    | "quiz"
    | "onboardWhatsapp"
    | "joinGroupChat"
    | "nlb"
    | "completed"
    | "offboarded";
  hasReceivedExtension: boolean;
  hasCompletedProgramme: boolean;
  certificateUrl: string | null;
  lastActivatedDate: Date | null;
  offboardingTime: Date | null;
  lastInactivityWarningSent: Date | null;
  numVoted: number;
  lastVotedTimestamp: Date | null;
  getNameMessageId: string | null;
  dailyAssignmentCount: number;
}

// Database service result wrapper
export interface DBServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

// Vote and Poll types
export interface VoteAPI {
  _id: string;
  pollId: string;
  checkerId: string;
  category: string | null;
  truthScore: number | null;
  responseCategory: string | null;
  createdTimestamp: Date;
  votedTimestamp: Date | null;
  responseTime: number | null;
  score: number | null;
  isCorrect: boolean | null;
  telegramMessageId: number | null;
}

export interface PollAPI {
  _id: string;
  checkId: string;
  crowdSourcedCategory: string | null;
  crowdSourcedTruthScore: number | null;
  shortformResponse?: {
    downvoted?: boolean;
  };
}

// Service binding interfaces
export interface CheckersDBService {
  findCheckers(
    filter: Record<string, unknown>,
    options?: { sort?: Record<string, 1 | -1> }
  ): Promise<DBServiceResult<CheckerAPI[]>>;
  updateOneChecker(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
  findOneVote(
    filter: Record<string, unknown>
  ): Promise<DBServiceResult<VoteAPI>>;
  findVotes(
    filter: Record<string, unknown>
  ): Promise<DBServiceResult<VoteAPI[]>>;
  updateOneVote(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
  findOnePoll(
    filter: Record<string, unknown>
  ): Promise<DBServiceResult<PollAPI>>;
  updateOnePoll(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; previousDocument?: PollAPI; error?: string }>;
  getVotesDetails(
    pollId: string,
    aggregationPipeline: unknown[]
  ): Promise<DBServiceResult<unknown[]>>;
}

export interface CheckerReminderAlarmService {
  scheduleReactivationReminders(
    checkerId: string,
    telegramId: string,
    checkerName: string
  ): Promise<{ success: boolean; error?: string }>;
  cancelReminders(checkerId: string): Promise<{ success: boolean; error?: string }>;
}

// Generic event envelope for queue messages
export interface CheckersEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

// Event-specific data types
export interface VoteSubmittedData {
  voteId: string;
}

export interface AssessmentCompleteData {
  pollId: string;
  primaryCategory: string;
  truthScore: number | null;
  isDownvoted: boolean;
}

export interface PrimaryCategoryChangedData {
  pollId: string;
  primaryCategory: string;
  truthScore: number | null;
  isDownvoted: boolean;
}

// Handler result type
export interface HandlerResult {
  processed: number;
  errors: string[];
}

// Bot instances type for scheduled handlers
export interface BotInstances {
  bot: Bot;
  adminBot: Bot;
}
