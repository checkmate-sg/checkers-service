import { describe, it, expect } from "vitest";

import { selectCandidates } from "../../workers/checkers-chat-management-service/src/sweep";
import type { CandidateMessage } from "../../workers/checkers-chat-management-service/src/types";

const NOW_SECONDS = Math.floor(Date.now() / 1000);

/** Build a chat message N minutes old. Text is long enough to be answerable. */
function message(
  messageId: number,
  minutesAgo: number,
  replyToMessageId: number | null = null,
  text = "When do volunteer hours show up?"
): CandidateMessage {
  return {
    messageId,
    userName: `checker${messageId}`,
    text,
    date: NOW_SECONDS - minutesAgo * 60,
    replyToMessageId,
    messageThreadId: null,
  };
}

const OPTS = { graceMinutes: 30, maxAgeHours: 12 };

describe("selectCandidates", () => {
  it("holds a question back until the grace period has elapsed", () => {
    // The whole point of the grace period is that humans answer first.
    const tooRecent = selectCandidates([message(1, 5)], new Set(), OPTS);
    expect(tooRecent).toHaveLength(0);

    const ripe = selectCandidates([message(1, 45)], new Set(), OPTS);
    expect(ripe.map(m => m.messageId)).toEqual([1]);
  });

  it("skips a question once a human has replied to it", () => {
    // Message 2 is a reply to message 1, so message 1 is already answered.
    const messages = [message(1, 60), message(2, 50, 1)];

    const candidates = selectCandidates(messages, new Set(), OPTS);

    expect(candidates.map(m => m.messageId)).not.toContain(1);
  });

  it("skips questions already handled by an earlier sweep", () => {
    const candidates = selectCandidates([message(1, 60)], new Set([1]), OPTS);

    expect(candidates).toHaveLength(0);
  });

  it("drops questions older than the max age", () => {
    // 13h old, past the 12h ceiling — answering now would be noise.
    const candidates = selectCandidates([message(1, 13 * 60)], new Set(), OPTS);

    expect(candidates).toHaveLength(0);
  });

  it("still surfaces a question when the only reply is to a different message", () => {
    // Regression guard: a busy chat has replies flying around, and a reply to
    // someone else must not suppress an unrelated unanswered question.
    const messages = [message(1, 60), message(2, 55), message(3, 50, 2)];

    const candidates = selectCandidates(messages, new Set(), OPTS);

    expect(candidates.map(m => m.messageId)).toContain(1);
    expect(candidates.map(m => m.messageId)).not.toContain(2);
  });

  it("returns candidates oldest first so the earliest asker gets the answer", () => {
    // Matters because the sweep answers one message per FAQ per run.
    const messages = [message(3, 40), message(1, 90), message(2, 60)];

    const candidates = selectCandidates(messages, new Set(), OPTS);

    expect(candidates.map(m => m.messageId)).toEqual([1, 2, 3]);
  });

  it("ignores chatter and slash commands, which are recorded but never answered", () => {
    // Both are stored in Mongo for analysis; neither should cost a model call.
    const messages = [
      message(1, 60, null, "ok thanks"),
      message(2, 60, null, "/start"),
      message(3, 60, null, "How is my accuracy calculated?"),
    ];

    const candidates = selectCandidates(messages, new Set(), OPTS);

    expect(candidates.map(m => m.messageId)).toEqual([3]);
  });

  it("honours a shortened grace period, as staging uses", () => {
    // staging.json sets FAQ_GRACE_PERIOD_MINUTES to 1 for fast manual testing.
    const candidates = selectCandidates([message(1, 2)], new Set(), {
      graceMinutes: 1,
      maxAgeHours: 12,
    });

    expect(candidates).toHaveLength(1);
  });
});
