/**
 * Mock data for testing
 *
 * Using 20 checkers to properly test thresholds:
 * - min(0.8 * 20, 16) = 16 for unsure
 * - min(0.5 * 20, 10) = 10 for normal categories
 * - min(0.2 * 20, 4) = 4 for bigSuspicious
 */

// Generate 20 mock checkers
export const mockCheckers = Array.from({ length: 20 }, (_, i) => ({
  _id: "checker-" + String(i + 1).padStart(3, "0"),
  telegramId: String(100000 + i),
  name: "Checker " + (i + 1),
  whatsappId: null,
  singpassId: null,
  isActive: true,
  isOnboardingComplete: true,
  onboardingTime: new Date("2024-01-01"),
  isQuizComplete: true,
  quizScore: 80 + (i % 20),
  onboardingStatus: "completed" as const,
  hasReceivedExtension: false,
  hasCompletedProgramme: false,
  certificateUrl: null,
  numVoted: 10 + i,
  lastVotedTimestamp: new Date("2024-06-01"),
  getNameMessageId: null,
  dailyAssignmentCount: i % 5,
}));

export const mockPoll = {
  _id: "poll-001",
  checkId: "check-001",
  text: "Is this claim true: the government is giving free money?",
  imageURL: null,
  caption: null,
  longformResponse: {
    en: null,
    cn: null,
    links: null,
    timestamp: null,
  },
  shortformResponse: {
    en: "This claim is false. No such announcement was made.",
    cn: "此说法是错误的。没有这样的公告。",
    downvoted: false,
    links: [],
    timestamp: new Date("2024-06-01"),
  },
  humanResponse: {
    en: null,
    cn: null,
    links: null,
    timestamp: null,
    updatedBy: null,
  },
  crowdSourcedCategory: null,
  crowdSourcedTruthScore: null,
  startedTimestamp: new Date("2024-06-01"),
  assessedTimestamp: null,
};

// Factory function to create a vote
export function createVote(
  checkerId: string,
  pollId: string,
  category: string | null,
  truthScore: number | null = null
) {
  return {
    _id: "vote-" + checkerId + "-" + pollId,
    pollId,
    checkerId,
    createdTimestamp: new Date(),
    votedTimestamp: category ? new Date() : null,
    category,
    truthScore,
    responseCategory: category ? "acceptable" : null,
    commentOnResponse: null,
  };
}

// Create vote distributions for testing assessment logic
export function createVoteDistribution(
  pollId: string,
  distribution: Record<string, number>,
  infoTruthScore: number = 3
): Array<ReturnType<typeof createVote>> {
  const votes: Array<ReturnType<typeof createVote>> = [];
  let checkerIndex = 0;

  for (const [category, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      const truthScore = category === "info" ? infoTruthScore : null;
      votes.push(
        createVote(
          "checker-" + String(checkerIndex++).padStart(3, "0"),
          pollId,
          category === "null" ? null : category,
          truthScore
        )
      );
    }
  }

  return votes;
}

/**
 * Test scenarios for vote assessment
 *
 * Key thresholds:
 * - Category requires >50% of valid votes
 * - isAssessed requires:
 *   - unsure: >min(0.8 * checkerCount, 16) votes
 *   - normal: >min(0.5 * checkerCount, 10) votes
 *   - bigSus: >min(0.2 * checkerCount, 4) votes
 */
export const testScenarios = {
  // Clear scam: 11/20 = 55%, 11 > 10 threshold
  clearScam: {
    distribution: { scam: 11, legitimate: 5, unsure: 4 },
    expectedCategory: "scam",
    expectedAssessed: true,
  },

  // Scam but not enough votes: 10 valid votes, need >10
  // factCheckerCount = 20, threshold = min(10, 10) = 10, 10 > 10 = FALSE
  scamInsufficientVotes: {
    distribution: { scam: 6, legitimate: 4, null: 10 },
    expectedCategory: "scam",
    expectedAssessed: false,
  },

  // Big suspicious (>75%): only need >4 votes
  bigSuspicious: {
    distribution: { scam: 16, legitimate: 4 },
    expectedCategory: "scam",
    expectedAssessed: true,
  },

  // Another scam scenario (previously tested illicit, now merged)
  anotherScam: {
    distribution: { scam: 12, legitimate: 8 },
    expectedCategory: "scam",
    expectedAssessed: true,
  },

  // Info with low truth score (<1.5)
  infoUntrue: {
    distribution: { info: 12, legitimate: 4, unsure: 4 },
    infoTruthScore: 1.0,
    expectedCategory: "untrue",
    expectedTruthScore: 1.0,
    expectedAssessed: true,
  },

  // Info with mid truth score (1.5-3.75)
  infoMisleading: {
    distribution: { info: 12, legitimate: 4, unsure: 4 },
    infoTruthScore: 2.5,
    expectedCategory: "misleading",
    expectedTruthScore: 2.5,
    expectedAssessed: true,
  },

  // Info with high truth score (>3.75)
  infoAccurate: {
    distribution: { info: 12, legitimate: 4, unsure: 4 },
    infoTruthScore: 4.5,
    expectedCategory: "accurate",
    expectedTruthScore: 4.5,
    expectedAssessed: true,
  },

  // Clear satire
  clearSatire: {
    distribution: { satire: 11, info: 5, unsure: 4 },
    expectedCategory: "satire",
    expectedAssessed: true,
  },

  // Clear spam
  clearSpam: {
    distribution: { spam: 11, legitimate: 5, unsure: 4 },
    expectedCategory: "spam",
    expectedAssessed: true,
  },

  // Clear legitimate
  clearLegitimate: {
    distribution: { legitimate: 8, irrelevant: 4, unsure: 8 },
    expectedCategory: "legitimate",
    expectedAssessed: true,
  },

  // Clear irrelevant
  clearIrrelevant: {
    distribution: { irrelevant: 8, legitimate: 4, unsure: 8 },
    expectedCategory: "irrelevant",
    expectedAssessed: true,
  },

  // No clear majority -> unsure, needs >16 votes
  unsureNoClearMajority: {
    distribution: { scam: 4, legitimate: 4, info: 4, spam: 4, unsure: 4 },
    expectedCategory: "unsure",
    expectedAssessed: true,
  },

  // Unsure explicit majority
  unsureExplicit: {
    distribution: { unsure: 11, scam: 5, legitimate: 4 },
    expectedCategory: "unsure",
    expectedAssessed: true,
  },

  // Unsure but not enough votes (need >16)
  // factCheckerCount = 20, threshold = min(16, 16) = 16, 15 > 16 = FALSE
  unsureInsufficientVotes: {
    distribution: { scam: 3, legitimate: 3, info: 3, spam: 3, unsure: 3, null: 5 },
    expectedCategory: "unsure",
    expectedAssessed: false,
  },

  // All pass votes
  allPass: {
    distribution: { pass: 20 },
    expectedCategory: "unsure",
    expectedAssessed: false,
  },

  // Mix with null (not voted yet)
  withNullVotes: {
    distribution: { scam: 8, legitimate: 4, null: 8 },
    expectedCategory: "scam",
    expectedAssessed: true,
  },

  // Exactly at 50% (should NOT trigger category)
  exactlyAt50Percent: {
    distribution: { scam: 10, legitimate: 10 },
    expectedCategory: "unsure",
    expectedAssessed: true,
  },

  // Just over 50%
  justOver50Percent: {
    distribution: { scam: 11, legitimate: 9 },
    expectedCategory: "scam",
    expectedAssessed: true,
  },
};
