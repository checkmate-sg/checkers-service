import { describe, it, expect, vi, beforeEach } from "vitest";

import { voteAssessment } from "@/shared/helpers/voteAssessment";
import { testScenarios } from "../fixtures/mockData";

// Mock DB service
const mockGetVotesDetails = vi.fn();
const mockDbService = {
  getVotesDetails: mockGetVotesDetails,
};

// Helper to set up mocks for a given vote distribution
function setupMocks(
  distribution: Record<string, number>,
  infoTruthScore: number = 3,
  unacceptablePercentage: number = 0.2
) {
  let totalVotes = 0;
  let infoCount = 0;

  for (const [category, count] of Object.entries(distribution)) {
    totalVotes += count;
    if (category === "info") {
      infoCount = count;
    }
  }

  const totalTruthScoreValue = infoCount * infoTruthScore;

  // Convert distribution to aggregation result format
  const categoryData = Object.entries(distribution)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      _id: category === "null" ? null : category,
      count,
    }));

  // Response category distribution
  const unacceptableCount = Math.floor(totalVotes * unacceptablePercentage);
  const acceptableCount = Math.floor(totalVotes * (1 - unacceptablePercentage) * 0.6);
  const greatCount = Math.floor(totalVotes * (1 - unacceptablePercentage) * 0.4);

  const responseCategoryData = [
    { _id: "great", count: greatCount },
    { _id: "acceptable", count: acceptableCount },
    { _id: "unacceptable", count: unacceptableCount },
  ].filter((item) => item.count > 0);

  // Mock getVotesDetails to return different data based on the pipeline
  mockGetVotesDetails.mockImplementation((pollId: string, pipeline: unknown[]) => {
    const pipelineStr = JSON.stringify(pipeline);

    // Category count query
    if (pipelineStr.includes('"$group"') && pipelineStr.includes('"$category"')) {
      return Promise.resolve({ success: true, data: categoryData });
    }

    // Total vote count query
    if (pipelineStr.includes('"$count"')) {
      return Promise.resolve({
        success: true,
        data: [{ totalVoteRequestCount: totalVotes }],
      });
    }

    // Truth score sum query
    if (pipelineStr.includes('"totalTruthScore"')) {
      return Promise.resolve({
        success: true,
        data: infoCount > 0 ? [{ totalTruthScore: totalTruthScoreValue }] : [],
      });
    }

    // Response category count query
    if (pipelineStr.includes('"$responseCategory"')) {
      return Promise.resolve({ success: true, data: responseCategoryData });
    }

    return Promise.resolve({ success: true, data: [] });
  });
}

describe("voteAssessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Category Detection", () => {
    it("should detect clear scam majority", async () => {
      const scenario = testScenarios.clearScam;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      if (scenario.expectedAssessed) {
        expect(result.data).not.toBeNull();
        expect(result.data?.primaryCategory).toBe(scenario.expectedCategory);
      }
    });

    it("should detect scam with majority scam votes", async () => {
      const scenario = testScenarios.anotherScam;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("scam");
    });

    it("should detect big suspicious and assess quickly", async () => {
      const scenario = testScenarios.bigSuspicious;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("scam");
    });

    it("should detect clear satire", async () => {
      const scenario = testScenarios.clearSatire;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("satire");
    });

    it("should detect clear spam", async () => {
      const scenario = testScenarios.clearSpam;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("spam");
    });

    it("should detect clear legitimate", async () => {
      const scenario = testScenarios.clearLegitimate;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("legitimate");
    });

    it("should detect clear irrelevant", async () => {
      const scenario = testScenarios.clearIrrelevant;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("irrelevant");
    });
  });

  describe("Info Category with Truth Scores", () => {
    it("should detect info with low truth score (untrue)", async () => {
      const scenario = testScenarios.infoUntrue;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("untrue");
      expect(result.data?.truthScore).toBe(scenario.infoTruthScore);
    });

    it("should detect info with mid truth score (misleading)", async () => {
      const scenario = testScenarios.infoMisleading;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("misleading");
      expect(result.data?.truthScore).toBe(scenario.infoTruthScore);
    });

    it("should detect info with high truth score (accurate)", async () => {
      const scenario = testScenarios.infoAccurate;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("accurate");
      expect(result.data?.truthScore).toBe(scenario.infoTruthScore);
    });
  });

  describe("Unsure Scenarios", () => {
    it("should return unsure when no clear majority", async () => {
      const scenario = testScenarios.unsureNoClearMajority;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("unsure");
    });

    it("should return unsure with explicit unsure majority", async () => {
      const scenario = testScenarios.unsureExplicit;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("unsure");
    });
  });

  describe("Assessment Thresholds", () => {
    it("should NOT assess when insufficient votes for normal category", async () => {
      const scenario = testScenarios.scamInsufficientVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Not enough votes to assess
    });

    it("should NOT assess when insufficient votes for unsure", async () => {
      const scenario = testScenarios.unsureInsufficientVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Need >16 votes for unsure
    });

    it("should NOT assess when all votes are pass", async () => {
      const scenario = testScenarios.allPass;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // No valid votes
    });

    it("should handle votes with null (not yet voted)", async () => {
      const scenario = testScenarios.withNullVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      // Should still assess based on valid votes
    });
  });

  describe("Edge Cases", () => {
    it("should return unsure when exactly at 50% threshold", async () => {
      const scenario = testScenarios.exactlyAt50Percent;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("unsure");
    });

    it("should detect category when just over 50%", async () => {
      const scenario = testScenarios.justOver50Percent;
      setupMocks(scenario.distribution);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.primaryCategory).toBe("scam");
    });
  });

  describe("isDownvoted (Community Note Downvote)", () => {
    it("should return isDownvoted: true when >50% vote unacceptable", async () => {
      const scenario = testScenarios.clearScam;
      // 60% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.6);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.isDownvoted).toBe(true);
    });

    it("should return isDownvoted: false when <=50% vote unacceptable", async () => {
      const scenario = testScenarios.clearScam;
      // 40% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.4);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.isDownvoted).toBe(false);
    });

    it("should return isDownvoted: false when exactly at 50%", async () => {
      const scenario = testScenarios.clearScam;
      // Exactly 50% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.5);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data?.isDownvoted).toBe(false);
    });

    it("should not return isDownvoted when poll is not yet assessed", async () => {
      const scenario = testScenarios.scamInsufficientVotes;
      setupMocks(scenario.distribution, 3, 0.6);

      const result = await voteAssessment(mockDbService, "poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Not assessed yet
    });
  });
});
