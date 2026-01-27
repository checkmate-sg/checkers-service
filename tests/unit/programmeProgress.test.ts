import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getReportCount before importing calculateProgrammeProgress
vi.mock("@/lib/helpers/getReportCount", () => ({
  getReportCount: vi.fn(),
}));

import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";
import { getReportCount } from "@/lib/helpers/getReportCount";
import { createVote } from "../fixtures/mockData";

// Mock DB service functions
const mockFindOneChecker = vi.fn();
const mockFindVotes = vi.fn();

// Mock environment
const mockEnv = {
  CHECKERS_DB_SERVICE: {
    findOneChecker: mockFindOneChecker,
    findVotes: mockFindVotes,
  },
} as unknown as CloudflareEnv;

// Test data factories
function createMockChecker(
  overrides: Partial<{
    numVoted: number;
    whatsappId: string | null;
  }> = {}
) {
  return {
    _id: "checker-001",
    telegramId: "123456",
    name: "Test Checker",
    numVoted: 75,
    whatsappId: "whatsapp-001",
    ...overrides,
  };
}

// Helper to create votes with isCorrect values
function createMockVotes(
  correctCount: number,
  incorrectCount: number,
  unassessedCount: number = 0
) {
  const votes = [];
  let id = 1;

  for (let i = 0; i < correctCount; i++) {
    votes.push(createVote(`checker-${id++}`, "poll-001", "scam", { isCorrect: true }));
  }
  for (let i = 0; i < incorrectCount; i++) {
    votes.push(createVote(`checker-${id++}`, "poll-001", "scam", { isCorrect: false }));
  }
  for (let i = 0; i < unassessedCount; i++) {
    votes.push(createVote(`checker-${id++}`, "poll-001", "scam", { isCorrect: null }));
  }

  return votes;
}

const defaultProgramme = {
  startDate: new Date("2024-01-01"),
  votesAtStart: 25,
};

describe("calculateProgrammeProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checker lookup", () => {
    it("should return error when checker is not found", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Checker not found",
      });
      expect(mockFindVotes).not.toHaveBeenCalled();
    });

    it("should return error when checker lookup returns success but no data", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Checker not found",
      });
    });

    it("should query checker with correct id", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindVotes.mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 5 });

      await calculateProgrammeProgress(mockEnv, "checker-xyz", defaultProgramme);

      expect(mockFindOneChecker).toHaveBeenCalledWith({ _id: "checker-xyz" });
    });
  });

  describe("votes lookup", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
    });

    it("should return error when votes query fails", async () => {
      mockFindVotes.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Checkers votes not found",
      });
    });

    it("should return error when votes query returns success but no data", async () => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Checkers votes not found",
      });
    });

    it("should query votes with correct filters", async () => {
      const programme = {
        startDate: new Date("2024-03-15"),
        votesAtStart: 10,
      };
      mockFindVotes.mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 5 });

      await calculateProgrammeProgress(mockEnv, "checker-001", programme);

      expect(mockFindVotes).toHaveBeenCalledWith({
        checkerId: "checker-001",
        votedTimestamp: { $gte: programme.startDate },
        isCorrect: { $ne: null },
      });
    });
  });

  describe("report count", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ whatsappId: "whatsapp-123" }),
      });
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(5, 5),
      });
    });

    it("should return error when getReportCount returns error", async () => {
      vi.mocked(getReportCount).mockResolvedValue({
        count: 0,
        error: "WhatsApp service unavailable",
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "WhatsApp service unavailable",
      });
    });

    it("should call getReportCount with correct parameters", async () => {
      const programme = {
        startDate: new Date("2024-06-01"),
        votesAtStart: 20,
      };
      vi.mocked(getReportCount).mockResolvedValue({ count: 10 });

      await calculateProgrammeProgress(mockEnv, "checker-001", programme);

      expect(getReportCount).toHaveBeenCalledWith(mockEnv, "whatsapp-123", programme.startDate);
    });
  });

  describe("vote count calculation", () => {
    beforeEach(() => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 5 });
    });

    it("should calculate voteCount as numVoted minus votesAtStart", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ numVoted: 100 }),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", {
        startDate: new Date("2024-01-01"),
        votesAtStart: 30,
      });

      expect(result.success).toBe(true);
      expect(result.data?.voteCount).toBe(70); // 100 - 30
    });

    it("should handle zero votes since programme start", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ numVoted: 50 }),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", {
        startDate: new Date("2024-01-01"),
        votesAtStart: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data?.voteCount).toBe(0);
    });

    it("should handle negative vote count (edge case if votesAtStart is incorrect)", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ numVoted: 20 }),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", {
        startDate: new Date("2024-01-01"),
        votesAtStart: 30,
      });

      expect(result.success).toBe(true);
      expect(result.data?.voteCount).toBe(-10); // Edge case: 20 - 30
    });
  });

  describe("accuracy calculation", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 5 });
    });

    it("should return 100% accuracy when all votes are correct", async () => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(10, 0),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(result.data?.accuracy).toBe(100);
    });

    it("should return 0% accuracy when all votes are incorrect", async () => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(0, 10),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(result.data?.accuracy).toBe(0);
    });

    it("should return 75% accuracy when 3 out of 4 votes are correct", async () => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(3, 1),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(result.data?.accuracy).toBe(75);
    });

    it("should return null accuracy when no assessed votes exist", async () => {
      mockFindVotes.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(result.data?.accuracy).toBe(null);
    });

    it("should ignore unassessed votes in accuracy calculation", async () => {
      // 2 correct, 2 incorrect, 6 unassessed
      // Only assessed votes (4) should count: 2/4 = 50%
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(2, 2, 6),
      });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(result.data?.accuracy).toBe(50);
    });
  });

  describe("successful progress calculation", () => {
    it("should return complete progress data", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ numVoted: 80, whatsappId: "wa-001" }),
      });
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(6, 4), // 60% accuracy
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 12 });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", {
        startDate: new Date("2024-01-01"),
        votesAtStart: 25,
      });

      expect(result).toEqual({
        success: true,
        data: {
          voteCount: 55, // 80 - 25
          accuracy: 60, // 6/10 * 100
          reportCount: 12,
        },
      });
    });

    it("should handle checker with null whatsappId", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ whatsappId: null }),
      });
      mockFindVotes.mockResolvedValue({
        success: true,
        data: createMockVotes(5, 5),
      });
      vi.mocked(getReportCount).mockResolvedValue({ count: 0 });

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result.success).toBe(true);
      expect(getReportCount).toHaveBeenCalledWith(mockEnv, null, defaultProgramme.startDate);
    });
  });

  describe("error handling", () => {
    it("should catch and return error when findOneChecker throws", async () => {
      mockFindOneChecker.mockRejectedValue(new Error("Database connection failed"));

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Database connection failed",
      });
    });

    it("should catch and return error when findVotes throws", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindVotes.mockRejectedValue(new Error("Votes query failed"));

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Votes query failed",
      });
    });

    it("should catch and return error when getReportCount throws", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindVotes.mockResolvedValue({
        success: true,
        data: [],
      });
      vi.mocked(getReportCount).mockRejectedValue(new Error("Report service error"));

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Report service error",
      });
    });

    it("should return 'Unknown error' for non-Error exceptions", async () => {
      mockFindOneChecker.mockRejectedValue("string error");

      const result = await calculateProgrammeProgress(mockEnv, "checker-001", defaultProgramme);

      expect(result).toEqual({
        success: false,
        error: "Unknown error",
      });
    });
  });
});
