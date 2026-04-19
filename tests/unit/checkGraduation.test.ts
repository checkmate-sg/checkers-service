import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock calculateProgrammeProgress before importing checkGraduation
vi.mock("@/lib/helpers/programmeProgress", () => ({
  calculateProgrammeProgress: vi.fn(),
}));

import { checkGraduation } from "@/shared/helpers/checkGraduation";
import { calculateProgrammeProgress } from "@/lib/helpers/programmeProgress";

// Mock DB service functions
const mockFindOneChecker = vi.fn();
const mockFindOneProgramme = vi.fn();
const mockQueueSend = vi.fn();

// Mock environment
const mockEnv = {
  CHECKERS_DB_SERVICE: {
    findOneChecker: mockFindOneChecker,
    findOneProgramme: mockFindOneProgramme,
  },
  CHECKERS_EVENTS_QUEUE: {
    send: mockQueueSend,
  },
} as unknown as CloudflareEnv;

// Test data factories
function createMockChecker(overrides: Partial<{ currentProgrammeId: string | null }> = {}) {
  return {
    _id: "checker-001",
    telegramId: "123456",
    name: "Test Checker",
    currentProgrammeId: "programme-001",
    ...overrides,
  };
}

function createMockProgramme(
  overrides: Partial<{
    targets: { votes: number; accuracy: number; reports: number };
    startDate: Date;
    votesAtStart: number;
  }> = {}
) {
  return {
    _id: "programme-001",
    checkerId: "checker-001",
    startDate: new Date("2024-01-01"),
    votesAtStart: 10,
    status: "active",
    targets: {
      votes: 50,
      accuracy: 60,
      reports: 10,
    },
    ...overrides,
  };
}

function createMockProgress(
  overrides: Partial<{
    voteCount: number;
    accuracy: number | null;
    reportCount: number;
  }> = {}
) {
  return {
    voteCount: 55,
    accuracy: 75,
    reportCount: 12,
    ...overrides,
  };
}

describe("checkGraduation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checker lookup", () => {
    it("should return error when checker is not found", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Checker not found",
      });
      expect(mockFindOneProgramme).not.toHaveBeenCalled();
    });

    it("should return error when checker lookup returns success but no data", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Checker not found",
      });
    });
  });

  describe("no active programme", () => {
    it("should return graduated: false when checker has no currentProgrammeId", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker({ currentProgrammeId: null }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: false,
      });
      expect(mockFindOneProgramme).not.toHaveBeenCalled();
      expect(calculateProgrammeProgress).not.toHaveBeenCalled();
    });
  });

  describe("programme lookup", () => {
    it("should return error when programme is not found", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: false,
        data: null,
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Programme not found",
      });
      expect(mockFindOneProgramme).toHaveBeenCalledWith({ _id: "programme-001" });
    });

    it("should return error when programme lookup returns success but no data", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Programme not found",
      });
    });
  });

  describe("progress calculation", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: createMockProgramme(),
      });
    });

    it("should return error when progress calculation fails", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: false,
        error: "Failed to fetch votes",
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Failed to fetch votes",
      });
    });

    it("should return default error message when progress fails without error", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: false,
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Failed to calculate progress",
      });
    });

    it("should pass correct parameters to calculateProgrammeProgress", async () => {
      const programme = createMockProgramme({
        startDate: new Date("2024-03-15"),
        votesAtStart: 25,
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: programme,
      });
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress(),
      });

      await checkGraduation(mockEnv, "checker-001");

      expect(calculateProgrammeProgress).toHaveBeenCalledWith(mockEnv, "checker-001", {
        startDate: programme.startDate,
        votesAtStart: 25,
      });
    });
  });

  describe("threshold checks", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: createMockProgramme({
          targets: { votes: 50, accuracy: 60, reports: 10 },
        }),
      });
    });

    it("should return graduated: false when vote count is below threshold", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 49, accuracy: 75, reportCount: 15 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: false,
      });
      expect(mockQueueSend).not.toHaveBeenCalled();
    });

    it("should return graduated: false when accuracy is below threshold", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 55, accuracy: 59, reportCount: 15 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: false,
      });
      expect(mockQueueSend).not.toHaveBeenCalled();
    });

    it("should return graduated: false when accuracy is null (treated as 0)", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 55, accuracy: null, reportCount: 15 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: false,
      });
      expect(mockQueueSend).not.toHaveBeenCalled();
    });

    it("should return graduated: false when report count is below threshold", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 55, accuracy: 75, reportCount: 9 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: false,
      });
      expect(mockQueueSend).not.toHaveBeenCalled();
    });
  });

  describe("graduation success", () => {
    beforeEach(() => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: createMockProgramme({
          targets: { votes: 50, accuracy: 60, reports: 10 },
        }),
      });
      mockQueueSend.mockResolvedValue(undefined);
    });

    it("should return graduated: true when all targets are met", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 50, accuracy: 60, reportCount: 10 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: true,
      });
    });

    it("should return graduated: true when targets are exceeded", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress({ voteCount: 100, accuracy: 85, reportCount: 25 }),
      });

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: true,
        graduated: true,
      });
    });

    it("should emit programme.completed event when graduated", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress(),
      });

      await checkGraduation(mockEnv, "checker-001");

      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "programme.completed",
          data: {
            checkerId: "checker-001",
            programmeId: "programme-001",
            stats: {
              voteCount: expect.any(Number),
              accuracy: expect.any(Number),
              reportCount: expect.any(Number),
            },
          },
          timestamp: expect.any(String),
        })
      );
    });

    it("should include ISO timestamp in graduation event", async () => {
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress(),
      });

      await checkGraduation(mockEnv, "checker-001");

      const sentEvent = mockQueueSend.mock.calls[0][0];
      expect(() => new Date(sentEvent.timestamp)).not.toThrow();
      expect(new Date(sentEvent.timestamp).toISOString()).toBe(sentEvent.timestamp);
    });
  });

  describe("error handling", () => {
    it("should catch and return error when findOneChecker throws", async () => {
      mockFindOneChecker.mockRejectedValue(new Error("Database connection failed"));

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Database connection failed",
      });
    });

    it("should catch and return error when findOneProgramme throws", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockRejectedValue(new Error("Programme fetch failed"));

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Programme fetch failed",
      });
    });

    it("should catch and return error when queue send throws", async () => {
      mockFindOneChecker.mockResolvedValue({
        success: true,
        data: createMockChecker(),
      });
      mockFindOneProgramme.mockResolvedValue({
        success: true,
        data: createMockProgramme(),
      });
      vi.mocked(calculateProgrammeProgress).mockResolvedValue({
        success: true,
        data: createMockProgress(),
      });
      mockQueueSend.mockRejectedValue(new Error("Queue unavailable"));

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Queue unavailable",
      });
    });

    it("should return 'Unknown error' for non-Error exceptions", async () => {
      mockFindOneChecker.mockRejectedValue("string error");

      const result = await checkGraduation(mockEnv, "checker-001");

      expect(result).toEqual({
        success: false,
        error: "Unknown error",
      });
    });
  });
});
