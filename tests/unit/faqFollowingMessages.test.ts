import { describe, it, expect } from "vitest";

import { followingMessages } from "../../workers/checkers-chat-management-service/src/sweep";
import type { CandidateMessage } from "../../workers/checkers-chat-management-service/src/types";

const NOW = Math.floor(Date.now() / 1000);

function msg(
  messageId: number,
  minutesAgo: number,
  text: string,
  threadId: number | null = null,
  userName = "checker"
): CandidateMessage {
  return {
    messageId,
    userName,
    text,
    date: NOW - minutesAgo * 60,
    replyToMessageId: null,
    messageThreadId: threadId,
  };
}

describe("followingMessages", () => {
  it("collects what was said after the question, in order", () => {
    // This context is the whole point: a colleague answering by simply typing
    // the next message leaves no reply metadata, so without the transcript the
    // model has no way to tell the question was already handled.
    const question = msg(1, 60, "When do volunteer hours show up on giving.sg?");
    const window = [
      question,
      msg(2, 55, "They get submitted at the end of the month", null, "admin"),
      msg(3, 50, "ah great, thanks!"),
    ];

    expect(followingMessages(window, question)).toEqual([
      { userName: "admin", text: "They get submitted at the end of the month" },
      { userName: "checker", text: "ah great, thanks!" },
    ]);
  });

  it("excludes messages from other topics", () => {
    // A conversation in General cannot have answered a question in the Q&A
    // topic; including it would invite false "already answered" verdicts.
    const question = msg(1, 60, "How is accuracy calculated?", 27);
    const window = [
      question,
      msg(2, 55, "Totally unrelated General chatter", null),
      msg(3, 50, "It compares your vote to the final verdict", 27, "admin"),
    ];

    expect(followingMessages(window, question)).toEqual([
      { userName: "admin", text: "It compares your vote to the final verdict" },
    ]);
  });

  it("excludes messages sent before the question", () => {
    const question = msg(5, 30, "Why am I not getting messages?");
    const window = [msg(4, 90, "Earlier unrelated message"), question];

    expect(followingMessages(window, question)).toEqual([]);
  });

  it("excludes the question itself", () => {
    const question = msg(1, 60, "When do volunteer hours show up?");

    expect(followingMessages([question], question)).toEqual([]);
  });

  it("truncates long messages so one essay cannot dominate the prompt", () => {
    const question = msg(1, 60, "How is accuracy calculated?");
    const essay = "x".repeat(600);
    const window = [question, msg(2, 55, essay)];

    const [following] = followingMessages(window, question);

    expect(following.text).toHaveLength(401); // 400 chars plus the ellipsis
    expect(following.text.endsWith("…")).toBe(true);
  });

  it("caps how many following messages are included", () => {
    const question = msg(1, 120, "When do volunteer hours show up?");
    const window = [
      question,
      ...Array.from({ length: 40 }, (_, i) => msg(i + 2, 110 - i, `message ${i}`)),
    ];

    expect(followingMessages(window, question)).toHaveLength(25);
  });
});
