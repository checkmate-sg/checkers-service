import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the utility functions before importing voteAssessment
vi.mock("@/lib/helpers/voteAssessment/voteAssessmentUtils", () => ({
  getCategoryCountsByPollId: vi.fn(),
  getTotalVoteRequestsCount: vi.fn(),
  getTotalTruthScoreValue: vi.fn(),
  computeTruthScore: vi.fn(),
  getResponseCategoryCountsByPollId: vi.fn(),
}));

import { voteAssessment } from "@/lib/helpers/voteAssessment/voteAssessment";
import * as utils from "@/lib/helpers/voteAssessment/voteAssessmentUtils";
import { testScenarios, createVoteDistribution } from "../fixtures/mockData";

// Helper to set up mocks for a given vote distribution
function setupMocks(
  distribution: Record<string, number>,
  infoTruthScore: number = 3,
  unacceptablePercentage: number = 0.2
) {
  // Calculate category counts from distribution
  const categoryCounts: Record<string, number> = {
    scam: 0,
    illicit: 0,
    info: 0,
    satire: 0,
    spam: 0,
    legitimate: 0,
    irrelevant: 0,
    unsure: 0,
    pass: 0,
    null: 0,
  };

  let totalVotes = 0;
  let infoCount = 0;

  for (const [category, count] of Object.entries(distribution)) {
    categoryCounts[category] = count;
    totalVotes += count;
    if (category === "info") {
      infoCount = count;
    }
  }

  const totalTruthScoreValue = infoCount * infoTruthScore;

  vi.mocked(utils.getCategoryCountsByPollId).mockResolvedValue(categoryCounts);
  vi.mocked(utils.getTotalVoteRequestsCount).mockResolvedValue(totalVotes);
  vi.mocked(utils.getTotalTruthScoreValue).mockResolvedValue(totalTruthScoreValue);
  vi.mocked(utils.computeTruthScore).mockResolvedValue(
    infoCount > 0 ? infoTruthScore : null
  );
  vi.mocked(utils.getResponseCategoryCountsByPollId).mockResolvedValue({
    great: Math.floor(totalVotes * (1 - unacceptablePercentage) * 0.4),
    acceptable: Math.floor(totalVotes * (1 - unacceptablePercentage) * 0.6),
    unacceptable: Math.floor(totalVotes * unacceptablePercentage),
    null: 0,
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

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      if (scenario.expectedAssessed) {
        expect(result.data).not.toBeNull();
        expect(result.data.primaryCategory).toBe(scenario.expectedCategory);
      }
    });

    it("should detect clear illicit when illicit >= scam", async () => {
      const scenario = testScenarios.clearIllicit;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("illicit");
    });

    it("should detect big suspicious and assess quickly", async () => {
      const scenario = testScenarios.bigSuspicious;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("scam");
    });

    it("should detect clear satire", async () => {
      const scenario = testScenarios.clearSatire;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("satire");
    });

    it("should detect clear spam", async () => {
      const scenario = testScenarios.clearSpam;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("spam");
    });

    it("should detect clear legitimate", async () => {
      const scenario = testScenarios.clearLegitimate;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("legitimate");
    });

    it("should detect clear irrelevant", async () => {
      const scenario = testScenarios.clearIrrelevant;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("irrelevant");
    });
  });

  describe("Info Category with Truth Scores", () => {
    it("should detect info with low truth score (untrue)", async () => {
      const scenario = testScenarios.infoUntrue;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("untrue");
      expect(result.data.truthScore).toBe(scenario.infoTruthScore);
    });

    it("should detect info with mid truth score (misleading)", async () => {
      const scenario = testScenarios.infoMisleading;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("misleading");
      expect(result.data.truthScore).toBe(scenario.infoTruthScore);
    });

    it("should detect info with high truth score (accurate)", async () => {
      const scenario = testScenarios.infoAccurate;
      setupMocks(scenario.distribution, scenario.infoTruthScore);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("accurate");
      expect(result.data.truthScore).toBe(scenario.infoTruthScore);
    });
  });

  describe("Unsure Scenarios", () => {
    it("should return unsure when no clear majority", async () => {
      const scenario = testScenarios.unsureNoClearMajority;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("unsure");
    });

    it("should return unsure with explicit unsure majority", async () => {
      const scenario = testScenarios.unsureExplicit;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("unsure");
    });
  });

  describe("Assessment Thresholds", () => {
    it("should NOT assess when insufficient votes for normal category", async () => {
      const scenario = testScenarios.scamInsufficientVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Not enough votes to assess
    });

    it("should NOT assess when insufficient votes for unsure", async () => {
      const scenario = testScenarios.unsureInsufficientVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Need >16 votes for unsure
    });

    it("should NOT assess when all votes are pass", async () => {
      const scenario = testScenarios.allPass;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // No valid votes
    });

    it("should handle votes with null (not yet voted)", async () => {
      const scenario = testScenarios.withNullVotes;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      // Should still assess based on valid votes
    });
  });

  describe("Edge Cases", () => {
    it("should return unsure when exactly at 50% threshold", async () => {
      const scenario = testScenarios.exactlyAt50Percent;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("unsure");
    });

    it("should detect category when just over 50%", async () => {
      const scenario = testScenarios.justOver50Percent;
      setupMocks(scenario.distribution);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.primaryCategory).toBe("scam");
    });
  });

  describe("isDownvoted (Community Note Downvote)", () => {
    it("should return isDownvoted: true when >50% vote unacceptable", async () => {
      const scenario = testScenarios.clearScam;
      // 60% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.6);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.isDownvoted).toBe(true);
    });

    it("should return isDownvoted: false when <=50% vote unacceptable", async () => {
      const scenario = testScenarios.clearScam;
      // 40% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.4);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.isDownvoted).toBe(false);
    });

    it("should return isDownvoted: false when exactly at 50%", async () => {
      const scenario = testScenarios.clearScam;
      // Exactly 50% unacceptable votes
      setupMocks(scenario.distribution, 3, 0.5);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).not.toBeNull();
      expect(result.data.isDownvoted).toBe(false);
    });

    it("should not return isDownvoted when poll is not yet assessed", async () => {
      const scenario = testScenarios.scamInsufficientVotes;
      setupMocks(scenario.distribution, 3, 0.6);

      const result = await voteAssessment("poll-001");

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Not assessed yet
    });
  });
});
