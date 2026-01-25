import { describe, expect, it } from "vitest";

import {
  checkAccuracy,
  computeAccuracyPercentage,
  computeGamificationScore,
} from "@/shared/helpers/scoring";
import { VoteAPI } from "@/shared/types/schema";
import { createVote } from "../fixtures/mockData";

describe("scoring helpers", () => {
  describe("computeGamificationScore", () => {
    const baseTime = new Date("2024-01-01T12:00:00Z");

    describe("correct votes", () => {
      it("should return maximum score (1.0) for immediate correct vote", () => {
        const votedTime = new Date(baseTime.getTime() + 1000); // 1 second later
        const score = computeGamificationScore(baseTime, votedTime, true);

        expect(score).toBe(1);
      });

      it("should return high score for vote within 5 minutes", () => {
        const votedTime = new Date(baseTime.getTime() + 4 * 60 * 1000); // 4 minutes
        const score = computeGamificationScore(baseTime, votedTime, true);

        // Within first bucket, should be close to 1
        expect(score).toBeGreaterThan(0.99);
      });

      it("should return reduced score for vote after 1 hour", () => {
        const votedTime = new Date(baseTime.getTime() + 60 * 60 * 1000); // 1 hour
        const score = computeGamificationScore(baseTime, votedTime, true);

        // 1 hour = 12 buckets (60 min / 5 min)
        // numBuckets = ceil(86400 / 300) = 288
        // score = 1 - (12 / 288 / 2) = 1 - 0.0208 = 0.979
        expect(score).toBeCloseTo(0.979, 2);
      });

      it("should return reduced score for vote after 12 hours", () => {
        const votedTime = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours
        const score = computeGamificationScore(baseTime, votedTime, true);

        // 12 hours = 144 buckets
        // score = 1 - (144 / 288 / 2) = 1 - 0.25 = 0.75
        expect(score).toBeCloseTo(0.75, 2);
      });

      it("should return minimum score (0.5) for vote at exactly 24 hours", () => {
        const votedTime = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        const score = computeGamificationScore(baseTime, votedTime, true);

        // At 24 hours, timeBucket = 288, score = 1 - (288 / 288 / 2) = 0.5
        expect(score).toBeCloseTo(0.5, 2);
      });

      it("should cap at minimum score (0.5) for votes beyond 24 hours", () => {
        const votedTime = new Date(baseTime.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        const score = computeGamificationScore(baseTime, votedTime, true);

        // Should be capped at 0.5 (timeBucket is capped at numBuckets)
        expect(score).toBeCloseTo(0.5, 2);
      });
    });

    describe("incorrect votes", () => {
      it("should return 0 for incorrect vote regardless of time", () => {
        const votedTime = new Date(baseTime.getTime() + 1000); // 1 second
        const score = computeGamificationScore(baseTime, votedTime, false);

        expect(score).toBe(0);
      });

      it("should return 0 for slow incorrect vote", () => {
        const votedTime = new Date(baseTime.getTime() + 12 * 60 * 60 * 1000); // 12 hours
        const score = computeGamificationScore(baseTime, votedTime, false);

        expect(score).toBe(0);
      });
    });

    describe("null correctness (not yet assessed)", () => {
      it("should return 0 when isCorrect is null", () => {
        const votedTime = new Date(baseTime.getTime() + 1000);
        const score = computeGamificationScore(baseTime, votedTime, null);

        expect(score).toBe(0);
      });
    });
  });

  describe("checkAccuracy", () => {
    describe("non-info categories", () => {
      it("should return true when vote matches crowd-sourced category", () => {
        const result = checkAccuracy("scam", null, "scam", null);
        expect(result).toBe(true);
      });

      it("should return false when vote does not match crowd-sourced category", () => {
        const result = checkAccuracy("scam", null, "legitimate", null);
        expect(result).toBe(false);
      });

      it("should return true for matching satire category", () => {
        const result = checkAccuracy("satire", null, "satire", null);
        expect(result).toBe(true);
      });

      it("should return true for matching spam category", () => {
        const result = checkAccuracy("spam", null, "spam", null);
        expect(result).toBe(true);
      });

      it("should return true for matching legitimate category", () => {
        const result = checkAccuracy("legitimate", null, "legitimate", null);
        expect(result).toBe(true);
      });

      it("should return true for matching irrelevant category", () => {
        const result = checkAccuracy("irrelevant", null, "irrelevant", null);
        expect(result).toBe(true);
      });

      it("should return true for matching illicit category", () => {
        const result = checkAccuracy("illicit", null, "illicit", null);
        expect(result).toBe(true);
      });
    });

    describe("info category with truth scores", () => {
      it("should return true when truth scores match exactly", () => {
        const result = checkAccuracy("info", 3, "misleading", 3);
        expect(result).toBe(true);
      });

      it("should return true when truth scores are within 1 point (vote higher)", () => {
        const result = checkAccuracy("info", 4, "accurate", 3);
        expect(result).toBe(true);
      });

      it("should return true when truth scores are within 1 point (vote lower)", () => {
        const result = checkAccuracy("info", 2, "misleading", 3);
        expect(result).toBe(true);
      });

      it("should return false when truth scores differ by more than 1", () => {
        const result = checkAccuracy("info", 1, "accurate", 4);
        expect(result).toBe(false);
      });

      it("should return null when vote truth score is null", () => {
        const result = checkAccuracy("info", null, "misleading", 3);
        expect(result).toBe(null);
      });

      it("should return null when crowd-sourced truth score is null", () => {
        const result = checkAccuracy("info", 3, "misleading", null);
        expect(result).toBe(null);
      });

      it("should return false when info vote but crowd category is not truth-related", () => {
        const result = checkAccuracy("info", 3, "scam", null);
        expect(result).toBe(false);
      });

      it("should work with untrue crowd-sourced category", () => {
        const result = checkAccuracy("info", 1, "untrue", 1);
        expect(result).toBe(true);
      });

      it("should work with accurate crowd-sourced category", () => {
        const result = checkAccuracy("info", 5, "accurate", 5);
        expect(result).toBe(true);
      });
    });

    describe("edge cases returning null (no penalty/reward)", () => {
      it("should return null when crowd-sourced category is null", () => {
        const result = checkAccuracy("scam", null, null, null);
        expect(result).toBe(null);
      });

      it("should return null when crowd-sourced category is unsure", () => {
        const result = checkAccuracy("scam", null, "unsure", null);
        expect(result).toBe(null);
      });

      it("should return null when vote category is pass", () => {
        const result = checkAccuracy("pass", null, "scam", null);
        expect(result).toBe(null);
      });

      it("should return null when vote category is null", () => {
        const result = checkAccuracy(null, null, "scam", null);
        expect(result).toBe(null);
      });
    });
  });

  describe("computeAccuracyPercentage", () => {
    // Helper to create a vote with specific isCorrect value using shared createVote
    const mockVote = (id: number, isCorrect: boolean | null) =>
      createVote(`checker-${id}`, "poll-001", "scam", { isCorrect }) as unknown as VoteAPI;

    describe("basic calculations", () => {
      it("should return 100% when all assessed votes are correct", () => {
        const votes = [mockVote(1, true), mockVote(2, true), mockVote(3, true)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(100);
      });

      it("should return 0% when all assessed votes are incorrect", () => {
        const votes = [mockVote(1, false), mockVote(2, false), mockVote(3, false)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(0);
      });

      it("should return 50% when half are correct", () => {
        const votes = [
          mockVote(1, true),
          mockVote(2, true),
          mockVote(3, false),
          mockVote(4, false),
        ];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(50);
      });

      it("should return 75% when 3 out of 4 are correct", () => {
        const votes = [mockVote(1, true), mockVote(2, true), mockVote(3, true), mockVote(4, false)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(75);
      });

      it("should return 33.33% when 1 out of 3 are correct", () => {
        const votes = [mockVote(1, true), mockVote(2, false), mockVote(3, false)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBeCloseTo(33.33, 1);
      });
    });

    describe("filtering unassessed votes", () => {
      it("should ignore votes with null isCorrect", () => {
        const votes = [
          mockVote(1, true),
          mockVote(2, true),
          mockVote(3, null), // Should be ignored
          mockVote(4, null), // Should be ignored
        ];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(100); // 2/2 correct
      });

      it("should calculate correctly when mixing assessed and unassessed", () => {
        const votes = [
          mockVote(1, true),
          mockVote(2, false),
          mockVote(3, null),
          mockVote(4, true),
          mockVote(5, null),
        ];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBeCloseTo(66.67, 1); // 2/3 correct
      });
    });

    describe("edge cases", () => {
      it("should return null for empty votes array", () => {
        const result = computeAccuracyPercentage([]);
        expect(result).toBe(null);
      });

      it("should return null when all votes are unassessed (null)", () => {
        const votes = [mockVote(1, null), mockVote(2, null), mockVote(3, null)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(null);
      });

      it("should handle single correct vote", () => {
        const votes = [mockVote(1, true)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(100);
      });

      it("should handle single incorrect vote", () => {
        const votes = [mockVote(1, false)];

        const result = computeAccuracyPercentage(votes);
        expect(result).toBe(0);
      });
    });
  });
});
