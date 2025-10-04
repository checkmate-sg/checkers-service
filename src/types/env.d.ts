// Extend the CloudflareEnv interface from OpenNext with our custom bindings
import { CheckerAPI, PollAPI, VoteAPI } from '@/shared/types/schema';

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
      ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
      findCheckersVote(
        sortField: any,
        offset: any, 
        limit: any, 
        checkerId: any,
        voteCheckerStatus: any
      ): Promise<{success: boolean; data?: any; total?: any; error?: string}>
      updateOneVote(
        filter: any,
        update: any
      ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
      findOneChecker(
        filter: any
      ): Promise<{ success: boolean; data?: CheckerAPI; error?: string }>;
      findCheckers(
        filter: any,
        options?: any
      ): Promise<{ success: boolean; data?: CheckerAPI[]; error?: string; total: number;}>;
      findOnePoll(
        filter: any
      ): Promise<{ success: boolean; data?: PollAPI; error?: string }>;
      findOneVote(
        filter: any
      ): Promise<{ success: boolean; data?: VoteAPI; error?: string }>;
    };
    CHECKMATE_WHATSAPP_SERVICE?: any;

    // Environment variables (these extend the base CloudflareEnv)
    TELEGRAM_WEBHOOK_SECRET?: string;
    NEXTAUTH_URL?: string;
    TYPEFORM_URL?: string;
    WHATSAPP_BOT_LINK?: string;
    CHECKERS_GROUP_LINK?: string;
    CHECKERS_CHAT_ID?: string;
    ENVIRONMENT?: string;
  }
}

// Export empty object to make this a module
export {};
