import { WorkerEntrypoint } from "cloudflare:workers";
import { Bot } from "grammy";

import { handleAssessmentComplete } from "./handlers/queue/onAssessmentComplete";
import { handlePrimaryCategoryChanged } from "./handlers/queue/onPrimaryCategoryChanged";
import { handleVoteSubmitted } from "./handlers/queue/onVoteSubmitted";
import { runInactivityChecks } from "./handlers/scheduled/inactivity";
import { runProgrammeChecks } from "./handlers/scheduled/programme";
import type {
  AssessmentCompleteData,
  CheckersEvent,
  PrimaryCategoryChangedData,
  VoteSubmittedData,
} from "./types";

export default class extends WorkerEntrypoint<Env> {
  /**
   * RPC method to publish events to the queue (used for local dev via service binding)
   */
  async addToCheckersEventQueue(
    event: CheckersEvent
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.env.CHECKERS_EVENTS_QUEUE.send(event);
      console.log(`Published event to queue: ${JSON.stringify(event)}`);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";
      console.error(`Failed to publish event to queue: ${error}`);
      return { success: false, error };
    }
  }

  /**
   * Queue handler - processes events from the checkers events queue
   */
  async queue(batch: MessageBatch<CheckersEvent>): Promise<void> {
    console.log(`Processing ${batch.messages.length} messages from queue`);

    for (const message of batch.messages) {
      try {
        const event = message.body;
        console.log(`Received event: ${JSON.stringify(event)}`);

        switch (event.type) {
          case "vote.submitted":
            await handleVoteSubmitted(this.env, event.data as VoteSubmittedData);
            break;

          case "assessment.complete":
            await handleAssessmentComplete(this.env, event.data as AssessmentCompleteData);
            break;

          case "primaryCategory.changed":
            await handlePrimaryCategoryChanged(this.env, event.data as PrimaryCategoryChangedData);
            break;

          default:
            console.warn(`Unknown event type: ${event.type}`);
        }

        message.ack();
      } catch (err) {
        console.error(`Failed to process message: ${err}`);
        message.retry();
      }
    }
  }

  /**
   * HTTP handler - health checks and manual triggers
   */
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "healthy", service: "checkers-event-handler-service" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Manual trigger for testing (only in dev)
    if (url.pathname === "/__scheduled") {
      const cron = url.searchParams.get("cron");
      await this.scheduled({
        cron: cron || "11 12 * * *",
        scheduledTime: Date.now(),
      } as ScheduledEvent);
      return new Response("Scheduled handler executed", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Scheduled handler - runs cron jobs for checker lifecycle management
   */
  async scheduled(event: ScheduledEvent): Promise<void> {
    const bot = new Bot(this.env.TELEGRAM_BOT_TOKEN);
    const adminBot = new Bot(this.env.TELEGRAM_ADMIN_BOT_TOKEN);
    const cron = event.cron;

    console.log(`Batch job triggered by cron: ${cron}`);

    // 8:11 PM SGT (12:11 UTC) - Inactivity checks
    if (cron === "11 12 * * *") {
      await runInactivityChecks(this.env, bot);
    }

    // 8:41 PM SGT (12:41 UTC) - Programme checks
    if (cron === "41 12 * * *") {
      await runProgrammeChecks(this.env, bot, adminBot);
    }

    console.log("Batch job completed");
  }
}
