import { Bot } from "grammy";

// Type definitions for service bindings
interface CheckerAPI {
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

interface DBServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
}

interface CheckersDBService {
  findCheckers(
    filter: Record<string, unknown>,
    options?: { sort?: Record<string, 1 | -1> }
  ): Promise<DBServiceResult<CheckerAPI[]>>;
  updateOneChecker(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ success: boolean; modifiedCount?: number; error?: string }>;
}

interface CheckerReminderAlarmService {
  scheduleReactivationReminders(
    checkerId: string,
    telegramId: string,
    checkerName: string
  ): Promise<{ success: boolean; error?: string }>;
  cancelReminders(checkerId: string): Promise<{ success: boolean; error?: string }>;
}

// Constants
const DAYS_MS = 24 * 60 * 60 * 1000;
const INACTIVITY_WARNING_DAYS = 3;
const INACTIVITY_DEACTIVATION_DAYS = 10;
const PROGRAMME_EXTENSION_DAYS = 60;
const PROGRAMME_OFFBOARDING_DAYS = 90;

// Message templates
const MESSAGES = {
  inactivityWarning: (name: string, groupLink: string) => `📍 We Miss You! 👀

Hey ${name}, it looks like you've been inactive for the past 3 days. Just a friendly reminder: if we don't see any activity for 7 days, your access as a checker will be temporarily deactivated.

If you need any help or have any questions, feel free to ask in the Q&A channel of our <a href="${groupLink}">Checkers' Crew</a> - we're here to help! 😊`,

  deactivationNotice: (name: string) => `📍 Temporary Deactivation Notice

Hi ${name},

Your access as a checker has been temporarily deactivated due to inactivity. No worries though - simply press the button below to get back to checking! 🚀

We're excited to see you back in action soon 😊`,

  programmeExtension: (name: string, quizLink: string) => `📍 You've Got Another Chance! 🎓

Hi ${name},

Although you haven't met the graduation criteria just yet, we've extended your time in the programme by another month! You now have extra time to give it another go. 😊

If you need a refresher, you can refer to our <a href="${quizLink}">onboarding quiz</a> again. Don't hesitate to ask questions in the group chat if you need any guidance.

You're almost there, let's finish strong! 💪`,

  programmeOffboarding: (
    name: string,
    surveyLink: string
  ) => `📍 CheckMate Fact-checker Programme Status

Hi ${name},

Thank you so much for your time and dedication during the CheckMate programme. While you've given it your best, it seems we haven't quite met the criteria needed to continue as a volunteer in our checking crew.

We'd love to hear about your experience - your feedback will help us improve! Please take a moment to fill out this <a href="${surveyLink}">survey</a>.

As part of this process, you'll also be removed from the Checkers' Crew Telegram chat, and will not receive future messages to vote on. We appreciate your understanding and wish you all the best moving forward 💛

Thank you for your contribution,

The CheckMate Team`,
};

/**
 * Get the reference date for inactivity calculation.
 * Uses the most recent of: lastVotedTimestamp, onboardingTime, lastActivatedDate
 */
function getLastActiveDate(checker: CheckerAPI): Date | null {
  const dates = [checker.lastVotedTimestamp, checker.onboardingTime, checker.lastActivatedDate]
    .filter((d): d is Date => d !== null)
    .map(d => new Date(d));

  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map(d => d.getTime())));
}

/**
 * Calculate days since a given date
 */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / DAYS_MS);
}

/**
 * Process 3-day inactivity warnings
 */
async function processInactivityWarnings(
  env: Env,
  bot: Bot
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - INACTIVITY_WARNING_DAYS * DAYS_MS);

  // Find active checkers who might need a warning
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isActive: true,
    isOnboardingComplete: true,
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      const lastActive = getLastActiveDate(checker);
      if (!lastActive) continue;

      const daysSinceActive = daysSince(lastActive);

      // Check if inactive for 3+ days but less than 10 days
      if (
        daysSinceActive >= INACTIVITY_WARNING_DAYS &&
        daysSinceActive < INACTIVITY_DEACTIVATION_DAYS
      ) {
        // Check if we already sent a warning recently (within last 7 days)
        if (
          checker.lastInactivityWarningSent &&
          daysSince(new Date(checker.lastInactivityWarningSent)) < 7
        ) {
          continue;
        }

        // Send warning message
        await bot.api.sendMessage(
          checker.telegramId,
          MESSAGES.inactivityWarning(checker.name || "Checker", env.CHECKERS_GROUP_LINK),
          { parse_mode: "HTML" }
        );

        // Update lastInactivityWarningSent
        await env.CHECKERS_DB_SERVICE.updateOneChecker(
          { _id: checker._id },
          { $set: { lastInactivityWarningSent: new Date() } }
        );

        processed++;
        console.log(`Sent inactivity warning to checker ${checker._id}`);
      }
    } catch (err) {
      const errorMsg = `Failed to process warning for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 10-day deactivations
 */
async function processDeactivations(
  env: Env,
  bot: Bot
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  // Find active checkers
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isActive: true,
    isOnboardingComplete: true,
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      const lastActive = getLastActiveDate(checker);
      if (!lastActive) continue;

      const daysSinceActive = daysSince(lastActive);

      // Check if inactive for 10+ days
      if (daysSinceActive >= INACTIVITY_DEACTIVATION_DAYS) {
        // Send deactivation message with reactivate button
        await bot.api.sendMessage(
          checker.telegramId,
          MESSAGES.deactivationNotice(checker.name || "Checker"),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "Reactivate Now 🚀", callback_data: "reactivate" }]],
            },
          }
        );

        // Deactivate the checker
        await env.CHECKERS_DB_SERVICE.updateOneChecker(
          { _id: checker._id },
          { $set: { isActive: false } }
        );

        // Schedule reactivation reminders via alarm service
        await env.CHECKER_REMINDER_ALARM_SERVICE.scheduleReactivationReminders(
          checker._id,
          checker.telegramId,
          checker.name || "Checker"
        );

        processed++;
        console.log(`Deactivated checker ${checker._id} and scheduled reminders`);
      }
    } catch (err) {
      const errorMsg = `Failed to process deactivation for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 60-day programme extension notices
 */
async function processProgrammeExtensions(
  env: Env,
  bot: Bot
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_EXTENSION_DAYS * DAYS_MS);

  // Find checkers who onboarded > 60 days ago and haven't completed/received extension
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isOnboardingComplete: true,
    hasCompletedProgramme: false,
    hasReceivedExtension: false,
    onboardingTime: { $lt: thresholdDate },
    onboardingStatus: { $ne: "offboarded" },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      // Send extension notice
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.programmeExtension(checker.name || "Checker", env.QUIZ_LINK),
        { parse_mode: "HTML" }
      );

      // Mark as received extension
      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { _id: checker._id },
        { $set: { hasReceivedExtension: true } }
      );

      processed++;
      console.log(`Sent programme extension notice to checker ${checker._id}`);
    } catch (err) {
      const errorMsg = `Failed to process extension for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

/**
 * Process 90-day programme offboarding
 */
async function processProgrammeOffboarding(
  env: Env,
  bot: Bot,
  adminBot: Bot
): Promise<{ processed: number; errors: string[] }> {
  const errors: string[] = [];
  let processed = 0;

  const thresholdDate = new Date(Date.now() - PROGRAMME_OFFBOARDING_DAYS * DAYS_MS);

  // Find checkers who onboarded > 90 days ago, haven't completed programme,
  // and have already received their extension notice
  const result = await env.CHECKERS_DB_SERVICE.findCheckers({
    isOnboardingComplete: true,
    hasCompletedProgramme: false,
    hasReceivedExtension: true,
    onboardingTime: { $lt: thresholdDate },
    onboardingStatus: { $ne: "offboarded" },
  });

  if (!result.success || !result.data) {
    return { processed: 0, errors: [result.error || "Failed to fetch checkers"] };
  }

  for (const checker of result.data) {
    try {
      // Send offboarding message
      await bot.api.sendMessage(
        checker.telegramId,
        MESSAGES.programmeOffboarding(checker.name || "Checker", env.OFFBOARDED_SURVEY_LINK),
        { parse_mode: "HTML" }
      );

      // Remove from Telegram group
      try {
        // Immediately unban to allow future rejoining if needed
        await adminBot.api.unbanChatMember(env.CHECKERS_CHAT_ID, Number(checker.telegramId));
      } catch (groupErr) {
        console.error(`Failed to remove checker ${checker._id} from group: ${groupErr}`);
        // Continue with offboarding even if group removal fails
      }

      // Update checker record
      await env.CHECKERS_DB_SERVICE.updateOneChecker(
        { _id: checker._id },
        {
          $set: {
            isActive: false,
            offboardingTime: new Date(),
            onboardingStatus: "offboarded",
          },
        }
      );

      processed++;
      console.log(`Offboarded checker ${checker._id}`);
    } catch (err) {
      const errorMsg = `Failed to process offboarding for checker ${checker._id}: ${err}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { processed, errors };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "healthy", service: "checkers-batch-service" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Manual trigger for testing (only in dev)
    if (url.pathname === "/__scheduled") {
      const cron = url.searchParams.get("cron");
      await this.scheduled(
        { cron: cron || "11 12 * * *", scheduledTime: Date.now() } as ScheduledEvent,
        env,
        {} as ExecutionContext
      );
      return new Response("Scheduled handler executed", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const adminBot = new Bot(env.TELEGRAM_ADMIN_BOT_TOKEN);
    const cron = event.cron;

    console.log(`Batch job triggered by cron: ${cron}`);

    // 8:11 PM SGT (12:11 UTC) - Inactivity checks
    if (cron === "11 12 * * *") {
      console.log("Running inactivity checks...");

      const warningResult = await processInactivityWarnings(env, bot);
      console.log(
        `Inactivity warnings: ${warningResult.processed} processed, ${warningResult.errors.length} errors`
      );

      const deactivationResult = await processDeactivations(env, bot);
      console.log(
        `Deactivations: ${deactivationResult.processed} processed, ${deactivationResult.errors.length} errors`
      );
    }

    // 8:41 PM SGT (12:41 UTC) - Programme checks
    if (cron === "41 12 * * *") {
      console.log("Running programme checks...");

      const extensionResult = await processProgrammeExtensions(env, bot);
      console.log(
        `Programme extensions: ${extensionResult.processed} processed, ${extensionResult.errors.length} errors`
      );

      const offboardingResult = await processProgrammeOffboarding(env, bot, adminBot);
      console.log(
        `Programme offboarding: ${offboardingResult.processed} processed, ${offboardingResult.errors.length} errors`
      );
    }

    console.log("Batch job completed");
  },
} satisfies ExportedHandler<Env>;
