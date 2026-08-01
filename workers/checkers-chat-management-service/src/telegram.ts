import type { TelegramMessage } from "./types";

/**
 * Pure interpretation of Telegram payloads.
 *
 * Kept free of `cloudflare:workers` imports so the rules below — which are
 * subtle and worth testing — can be exercised outside the workerd runtime.
 */

/**
 * The genuine reply target of a message, or null if it is not a reply.
 *
 * Telegram points the first message of a forum topic at that topic's
 * `forum_topic_created` service message, which would otherwise read as "someone
 * already replied to this". The topic root's id *is* the thread id, so an equal
 * pair identifies the structural link rather than a real reply.
 */
export function resolveReplyTarget(message: TelegramMessage): number | null {
  const replyTo = message.reply_to_message?.message_id ?? null;
  if (replyTo === null) return null;
  if (message.message_thread_id !== undefined && replyTo === message.message_thread_id) {
    return null;
  }
  return replyTo;
}

/**
 * The forum topic a message belongs to, or null for General.
 *
 * Telegram omits `message_thread_id` entirely in General rather than sending a
 * sentinel value, so absence is the signal.
 */
export function resolveTopicId(message: TelegramMessage): number | null {
  return message.message_thread_id ?? null;
}
