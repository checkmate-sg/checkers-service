// Extend the CloudflareEnv interface from OpenNext with our custom bindings
import { CheckerAPI, PollAPI, PollUpdateMessage, VoteAPI } from '@/shared/types/schema';

// Event types for the checkers event queue
interface CheckersEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

interface VoteSubmittedEventData {
  voteId: string;
}

declare global {
  interface CloudflareEnv {
    // Service bindings
    CHECKERS_DB_SERVICE: {
      insertChecker(
        checker: Omit<CheckerAPI, "_id">,
        customId?: string
      ): Promise<{ success: boolean; id?: string; error?: string }>;
      insertPoll(
        poll: Omit<PollAPI, "_id">,
        customId?: string
      ): Promise<{ success: boolean; id?: string; error?: string }>;
      insertVote(
        vote: Omit<VoteAPI, "_id">,
        customId?: string
      ): Promise<{ success: boolean; id?: string; error?: string }>;
      updateOneChecker(
        filter: any,
        update: any
      ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
      updateOnePoll(
        filter: any,
        update: any
      ): Promise<{
        success: boolean;
        modifiedCount?: number;
        previousDocument?: PollAPI;
        error?: string;
      }>;
      findCheckersVote(
        sortField?: any,
        offset?: any,
        limit?: any,
        baseFilter?: any
      ): Promise<{ success: boolean; data?: any; total?: any; error?: string }>;
      getVotesDetails(
        pollId: any,
        aggregationPipeline: any[]
      ): Promise<{ success: boolean; data?: any; error?: any }>;
      updateOneVote(
        filter: any,
        update: any
      ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
      findOneChecker(filter: any): Promise<{ success: boolean; data?: CheckerAPI; error?: string }>;
      findCheckers(
        filter: any,
        options?: any
      ): Promise<{ success: boolean; data?: CheckerAPI[]; error?: string; total: number }>;
      findOnePoll(filter: any): Promise<{ success: boolean; data?: PollAPI; error?: string }>;
      findOneVote(filter: any): Promise<{ success: boolean; data?: VoteAPI; error?: string }>;
      getLeaderboardInfo(startOfMonth: Date, startOfNextMonth: Date):  Promise<{ success: boolean, data?: LeaderboardAPI[], total?: number, error?: string}>;
    };
    CHECKMATE_WHATSAPP_SERVICE?: any;

    // Event handler service binding (for local dev queue publishing)
    CHECKERS_EVENT_HANDLER_SERVICE?: {
      addToCheckersEventQueue(event: CheckersEvent): Promise<{ success: boolean; error?: string }>;
    };

    // Queue bindings
    POLL_UPDATE_QUEUE: Queue<PollUpdateMessage>;
    CHECKERS_EVENTS_QUEUE: Queue<CheckersEvent>;

    // Environment variables (these extend the base CloudflareEnv)
    NEXTAUTH_URL?: string;
    TYPEFORM_URL?: string;
    WHATSAPP_BOT_LINK?: string;
    CHECKERS_GROUP_LINK?: string;
    CHECKERS_CHAT_ID?: string;
    ENVIRONMENT?: string;
    CHECKER_REMINDER_ALARM_SERVICE?: any;
  }
}

// Export empty object to make this a module
export {};
