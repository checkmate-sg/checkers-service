import { describe, it, expect } from "vitest";

import { resolveOutcome } from "../../workers/checkers-chat-management-service/src/classify";
import type {
  FaqMatch,
  QuestionAssessment,
} from "../../workers/checkers-chat-management-service/src/types";

const THRESHOLD = 0.75;

function assessment(overrides: Partial<QuestionAssessment> = {}): QuestionAssessment {
  return { isQuestion: true, alreadyAnswered: false, ...overrides };
}

function match(overrides: Partial<FaqMatch> = {}): FaqMatch {
  return { faqId: "volunteer-hours", confidence: 0.95, answer: "Some answer.", ...overrides };
}

describe("resolveOutcome", () => {
  it("answers a confident match on an unanswered question", () => {
    expect(resolveOutcome(assessment(), match(), THRESHOLD)).toBe("answered");
  });

  it("short-circuits on not-a-question before looking at any match", () => {
    // Chatter must never reach stage 2, so a match object here is irrelevant.
    expect(resolveOutcome(assessment({ isQuestion: false }), match(), THRESHOLD)).toBe(
      "not-a-question"
    );
  });

  it("prefers human-answered over any FAQ match", () => {
    // A colleague getting there first outranks the bot having an answer ready.
    expect(resolveOutcome(assessment({ alreadyAnswered: true }), match(), THRESHOLD)).toBe(
      "human-answered"
    );
  });

  it("treats a null match as no-match, not as an error", () => {
    // matchFaq returns null only on transient failure; the caller decides whether
    // to retry. Here we assert the mapping is no-match rather than throwing.
    expect(resolveOutcome(assessment(), null, THRESHOLD)).toBe("no-match");
  });

  it("treats an explicit none as no-match", () => {
    expect(resolveOutcome(assessment(), match({ faqId: "none", answer: "" }), THRESHOLD)).toBe(
      "no-match"
    );
  });

  it("treats a matched id with an empty answer as no-match", () => {
    expect(resolveOutcome(assessment(), match({ answer: "" }), THRESHOLD)).toBe("no-match");
  });

  it("holds back a match below the threshold", () => {
    expect(resolveOutcome(assessment(), match({ confidence: 0.5 }), THRESHOLD)).toBe(
      "low-confidence"
    );
  });

  it("treats confidence exactly at the threshold as good enough", () => {
    // The sweep compares with <, so equality answers. Pinned because moving this
    // boundary silently changes how often the bot speaks.
    expect(resolveOutcome(assessment(), match({ confidence: THRESHOLD }), THRESHOLD)).toBe(
      "answered"
    );
  });

  it("honours a threshold raised in KV above the code default", () => {
    // The eval endpoint reads the same KV value as the sweep; this is the case
    // that used to diverge when dev.ts hardcoded the default.
    expect(resolveOutcome(assessment(), match({ confidence: 0.8 }), 0.9)).toBe("low-confidence");
  });
});
