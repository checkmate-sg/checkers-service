import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";
import { Bot } from "grammy";

import { getParameters, PARAMETER_DEFAULTS } from "@/shared/helpers/parameters";

// Constants
const DAYS_MS = 24 * 60 * 60 * 1000;

// Reminder state stored in DO storage
interface ReminderState {
  checkerId: string;
  telegramId: string;
  checkerName: string;
  deactivatedAt: number; // timestamp
  reminderStage: 1 | 2; // which reminder is next
  reminder1SentAt?: number;
}

// Message template for reactivation reminder
const REACTIVATION_REMINDER_MESSAGE = (
  name: string,
  numDays: number
) => `📍 We Miss You at CheckMate! 🥺

Hey ${name},

It's been ${numDays} days since we last saw you on the CheckMate bot, and we miss having you around! We'd love to have you back, so why not pop in when you have a moment? 😄

Simply press the button below to resume your checking journey. If you need any help, don't hesitate to reach out!

Looking forward to seeing you again 🤗`;

interface Env {
  TELEGRAM_BOT_TOKEN: string;
  CHECKERS_REMINDER_DURABLE_OBJECT: DurableObjectNamespace<CheckersReminderDurableObject>;
  CHECKMATE_CHECKERS_PARAMETERS_KV: KVNamespace;
}

/**
 * Durable Object for managing reactivation reminder alarms per checker.
 * Each checker gets their own DO instance identified by their checkerId.
 */
export class CheckersReminderDurableObject extends DurableObject<Env> {
  /**
   * Schedule reactivation reminders for a deactivated checker.
   * Sets an alarm for REMINDER_1_DAYS later (Reminder #1).
   */
  async scheduleReminders(
    checkerId: string,
    telegramId: string,
    checkerName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = Date.now();

      // Get reminder days from KV
      const { REMINDER_1_DAYS } = await getParameters(this.env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
        "REMINDER_1_DAYS",
      ]);

      // Store the reminder state
      const state: ReminderState = {
        checkerId,
        telegramId,
        checkerName,
        deactivatedAt: now,
        reminderStage: 1,
      };

      await this.ctx.storage.put("state", state);

      // Schedule alarm for Reminder #1
      const reminder1Time = now + REMINDER_1_DAYS * DAYS_MS;
      await this.ctx.storage.setAlarm(reminder1Time);

      console.log(
        `Scheduled Reminder #1 for checker ${checkerId} at ${new Date(reminder1Time).toISOString()}`
      );

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to schedule reminders for checker ${checkerId}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Cancel any pending reminders for this checker.
   * Called when the checker reactivates.
   */
  async cancelReminders(): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete the alarm
      await this.ctx.storage.deleteAlarm();

      // Clear the state
      await this.ctx.storage.delete("state");

      console.log("Cancelled reminders and cleared state");

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to cancel reminders: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Alarm handler - triggered when a reminder is due.
   */
  async alarm(): Promise<void> {
    const state = await this.ctx.storage.get<ReminderState>("state");

    if (!state) {
      console.log("No state found, alarm may have been cancelled");
      return;
    }

    // Get reminder days from KV
    const { REMINDER_2_DAYS } = await getParameters(this.env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
      "REMINDER_2_DAYS",
    ]);

    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    const now = Date.now();

    try {
      if (state.reminderStage === 1) {
        // Send Reminder #1
        const daysSinceDeactivation = Math.floor((now - state.deactivatedAt) / DAYS_MS);

        await bot.api.sendMessage(
          state.telegramId,
          REACTIVATION_REMINDER_MESSAGE(state.checkerName, daysSinceDeactivation),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "Reactivate Now 🚀", callback_data: "reactivate" }]],
            },
          }
        );

        console.log(`Sent Reminder #1 to checker ${state.checkerId}`);

        // Update state and schedule Reminder #2
        const updatedState: ReminderState = {
          ...state,
          reminderStage: 2,
          reminder1SentAt: now,
        };

        await this.ctx.storage.put("state", updatedState);

        // Schedule Reminder #2 (REMINDER_2_DAYS after Reminder #1)
        const reminder2Time = now + REMINDER_2_DAYS * DAYS_MS;
        await this.ctx.storage.setAlarm(reminder2Time);

        console.log(
          `Scheduled Reminder #2 for checker ${state.checkerId} at ${new Date(reminder2Time).toISOString()}`
        );
      } else if (state.reminderStage === 2) {
        // Send Reminder #2
        const daysSinceDeactivation = Math.floor((now - state.deactivatedAt) / DAYS_MS);

        await bot.api.sendMessage(
          state.telegramId,
          REACTIVATION_REMINDER_MESSAGE(state.checkerName, daysSinceDeactivation),
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [[{ text: "Reactivate Now 🚀", callback_data: "reactivate" }]],
            },
          }
        );

        console.log(`Sent Reminder #2 (final) to checker ${state.checkerId}`);

        // Clear state - no more reminders
        await this.ctx.storage.delete("state");
      }
    } catch (error) {
      console.error(
        `Failed to send reminder ${state.reminderStage} to checker ${state.checkerId}: ${error}`
      );
      // Don't reschedule on failure - the reminder is lost
      // Could implement retry logic here if needed
    }
  }
}

/**
 * Worker entrypoint that exposes RPC methods for the batch service to call.
 */
export default class extends WorkerEntrypoint<Env> {
  /**
   * Get or create a Durable Object instance for a checker.
   */
  private getDurableObject(checkerId: string) {
    const id = this.env.CHECKERS_REMINDER_DURABLE_OBJECT.idFromName(checkerId);
    return this.env.CHECKERS_REMINDER_DURABLE_OBJECT.get(id);
  }

  /**
   * Health check endpoint
   */
  async fetch(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({ status: "healthy", service: "checkers-reminder-alarm-service" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  /**
   * Schedule reactivation reminders for a deactivated checker.
   * Called by the batch service when a checker is deactivated.
   */
  async scheduleReactivationReminders(
    checkerId: string,
    telegramId: string,
    checkerName: string
  ): Promise<{ success: boolean; error?: string }> {
    const durableObject = this.getDurableObject(checkerId);
    return durableObject.scheduleReminders(checkerId, telegramId, checkerName);
  }

  /**
   * Cancel pending reminders for a checker.
   * Called when the checker reactivates via the bot.
   */
  async cancelReminders(checkerId: string): Promise<{ success: boolean; error?: string }> {
    const durableObject = this.getDurableObject(checkerId);
    return durableObject.cancelReminders();
  }
}
