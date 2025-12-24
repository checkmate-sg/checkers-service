import type { Checker } from "../../../shared/types/schema";

// Service binding types (RPC interfaces)
interface CheckersDbService {
  findOneChecker(filter: Record<string, unknown>): Promise<{
    success: boolean;
    data?: CheckerAPI;
    error?: string;
  }>;
  insertChecker(
    checker: Omit<Checker, "_id">,
    customId?: string
  ): Promise<{ success: boolean; id?: string; error?: string }>;
  updateOneChecker(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
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
