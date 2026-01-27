/**
 * Utility to publish events to the checkers event queue.
 *
 * In local dev: Uses service binding to event handler worker (which then publishes to its local queue)
 * In staging/production: Publishes directly to the queue
 */

interface CheckersEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

export interface VoteSubmittedEventData {
  voteId: string;
}

/**
 * Publish an event to the checkers event queue.
 * Automatically handles the difference between local dev and deployed environments.
 */
export async function publishCheckersEvent(
  env: CloudflareEnv,
  event: CheckersEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    // In local dev, use the service binding to the event handler
    // (since queue bindings don't work across separate wrangler processes)
    if (env.CHECKERS_EVENT_HANDLER_SERVICE) {
      console.log(`Publishing event via service binding: ${event.type}`);
      return await env.CHECKERS_EVENT_HANDLER_SERVICE.addToCheckersEventQueue(event);
    }

    // In staging/production, publish directly to the queue
    if (env.CHECKERS_EVENTS_QUEUE) {
      await env.CHECKERS_EVENTS_QUEUE.send(event);
      console.log(`Published event to queue: ${event.type}`);
      return { success: true };
    }

    console.warn("No queue binding available - event not published");
    return { success: false, error: "No queue binding available" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error(`Failed to publish event: ${error}`);
    return { success: false, error };
  }
}

/**
 * Helper to create a vote.submitted event
 */
export function createVoteSubmittedEvent(
  data: VoteSubmittedEventData
): CheckersEvent<VoteSubmittedEventData> {
  return {
    type: "vote.submitted",
    data,
    timestamp: new Date().toISOString(),
  };
}
