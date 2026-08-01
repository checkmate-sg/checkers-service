import { describe, it, expect } from "vitest";

import { resolveReplyTarget } from "../../workers/checkers-chat-management-service/src/telegram";
import { selectCandidates } from "../../workers/checkers-chat-management-service/src/sweep";
import type {
  CandidateMessage,
  TelegramMessage,
} from "../../workers/checkers-chat-management-service/src/types";

const CHAT_ID = -1001111111111; // fake; the real id is a deployment secret

/** Minimal Telegram message, shaped like the real getUpdates payload. */
function telegramMessage(overrides: Partial<TelegramMessage>): TelegramMessage {
  return {
    message_id: 1,
    from: { id: 111111, is_bot: false, first_name: "Test", username: "test_checker" },
    chat: { id: CHAT_ID, type: "supergroup", is_forum: true },
    date: 1785504758,
    text: "hello",
    ...overrides,
  };
}

describe("resolveReplyTarget", () => {
  it("discards the structural link to a topic's creation message", () => {
    // Taken from a real payload: message 28 is the first message in the Q&A
    // topic, and Telegram points it at the forum_topic_created message (27).
    // Treating that as a reply would make the topic root look answered, and in
    // a topic whose first post is a question, would silence the bot entirely.
    const message = telegramMessage({
      message_id: 28,
      message_thread_id: 27,
      reply_to_message: { message_id: 27 },
      is_topic_message: true,
      text: "Hi from q&a topic",
    });

    expect(resolveReplyTarget(message)).toBeNull();
  });

  it("keeps a genuine reply inside a topic", () => {
    // Same topic (thread 27), but replying to a real message (28), not the root.
    const message = telegramMessage({
      message_id: 30,
      message_thread_id: 27,
      reply_to_message: { message_id: 28 },
      is_topic_message: true,
    });

    expect(resolveReplyTarget(message)).toBe(28);
  });

  it("keeps a genuine reply in the General topic", () => {
    // General carries no message_thread_id at all, so there is no root to confuse.
    const message = telegramMessage({
      message_id: 31,
      reply_to_message: { message_id: 26 },
    });

    expect(resolveReplyTarget(message)).toBe(26);
  });

  it("returns null when the message is not a reply", () => {
    expect(resolveReplyTarget(telegramMessage({ message_id: 29 }))).toBeNull();
  });
});

describe("selectCandidates with forum topics", () => {
  const NOW = Math.floor(Date.now() / 1000);

  function buffered(
    messageId: number,
    minutesAgo: number,
    threadId: number | null,
    replyTo: number | null = null
  ): CandidateMessage {
    return {
      messageId,
      userName: "test_checker",
      text: "How do I get the volunteer hours?",
      date: NOW - minutesAgo * 60,
      replyToMessageId: replyTo,
      messageThreadId: threadId,
    };
  }

  it("surfaces questions from both General and a topic, keeping their thread ids", () => {
    const messages = [buffered(26, 60, null), buffered(28, 55, 27)];

    const candidates = selectCandidates(messages, new Set(), {
      graceMinutes: 30,
      maxAgeHours: 12,
    });

    // Thread id must survive: it is what routes the reply back to the right topic.
    expect(candidates.map(m => [m.messageId, m.messageThreadId])).toEqual([
      [26, null],
      [28, 27],
    ]);
  });

  it("does not let a reply in one topic suppress a question in another", () => {
    // Message 40 answers 28 inside the topic; the General question 26 stands.
    const messages = [buffered(26, 60, null), buffered(28, 55, 27), buffered(40, 50, 27, 28)];

    const candidates = selectCandidates(messages, new Set(), {
      graceMinutes: 30,
      maxAgeHours: 12,
    });

    const ids = candidates.map(m => m.messageId);
    expect(ids).toContain(26);
    expect(ids).not.toContain(28);
  });
});
