import type { Checker, Poll, Vote, Response, ShortformResponse, HumanResponse } from "../../../shared/types/schema";

// Service binding types (RPC interfaces)
interface CheckersDbService {
  findOneChecker(filter: Record<string, unknown>): Promise<{
    success: boolean;
    data?: CheckerAPI;
    error?: string;
  }>;
  findCheckers(
    filter: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<{
    success: boolean;
    data: CheckerAPI[];
    error?: string;
    total: number;
  }>;
  insertChecker(
    checker: Omit<Checker, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }>;
  updateOneChecker(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
  findOnePoll(filter: Record<string, unknown>): Promise<{
    success: boolean;
    data?: PollAPI;
    error?: string;
  }>;
  insertPoll(
    poll: Omit<PollAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }>;
  insertVote(
    vote: Omit<VoteAPI, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }>;
}

interface CheckerReminderAlarmService {
  cancelReminders(checkerId: string): Promise<{ success: boolean; error?: string }>;
  scheduleReactivationReminders(
    checkerId: string,
    telegramId: string,
    checkerName: string
  ): Promise<{ success: boolean; error?: string }>;
}

// Checker with string IDs (API format)
export interface CheckerAPI {
  _id?: string;
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
    | "otpSent"
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

// Poll with string IDs (API format)
export interface PollAPI {
  _id?: string;
  checkId: string;
  text: string | null;
  imageURL: string | null;
  caption: string | null;
  longformResponse: Response;
  shortformResponse: ShortformResponse;
  humanResponse: HumanResponse;
  crowdSourcedCategory:
    | "scam"
    | "illicit"
    | "untrue"
    | "misleading"
    | "accurate"
    | "satire"
    | "spam"
    | "legitimate"
    | "irrelevant"
    | "unsure"
    | null;
  crowdSourcedTruthScore: number | null;
  startedTimestamp: Date;
  assessedTimestamp: Date | null;
}

// Vote with string IDs (API format)
export interface VoteAPI {
  _id?: string;
  pollId: string;
  checkerId: string;
  createdTimestamp: Date;
  votedTimestamp: Date | null;
  category:
    | "scam"
    | "illicit"
    | "info"
    | "satire"
    | "spam"
    | "legitimate"
    | "irrelevant"
    | "unsure"
    | "pass"
    | null;
  truthScore: 0 | 1 | 2 | 3 | 4 | 5 | null;
  responseCategory: "great" | "acceptable" | "unacceptable" | null;
  commentOnResponse: string | null;
  responseTime: number | null; // Time taken to submit the vote in hours
  score: number | null; // Score awarded for this vote
  isCorrect: boolean | null; // Whether the vote matched the consensus
  showNoteAfterVote: boolean; // A/B test flag: true = show community note after voting, false = show before
}

// Poll request from CheckMate AI platform
export interface PollRequest {
  checkId: string;
  imageUrl: string | null;
  caption: string | null;
  text: string | null;
  longformResponse: Response | null;
  shortformResponse: ShortformResponse | null;
  humanResponse: HumanResponse | null;
}
