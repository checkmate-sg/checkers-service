import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route handler
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/helpers/voteAssessment/voteAssessment", () => ({
  voteAssessment: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

import { POST } from "@/app/api/votes/[voteId]/route";
import { auth } from "@/auth";
import { voteAssessment } from "@/lib/helpers/voteAssessment/voteAssessment";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Mock queue send function
const mockQueueSend = vi.fn();

// Mock DB service functions
const mockFindOneVote = vi.fn();
const mockUpdateOneVote = vi.fn();
const mockUpdateOnePoll = vi.fn();

// Setup mock env
const mockEnv = {
  CHECKERS_DB_SERVICE: {
    findOneVote: mockFindOneVote,
    updateOneVote: mockUpdateOneVote,
    updateOnePoll: mockUpdateOnePoll,
  },
  POLL_UPDATE_QUEUE: {
    send: mockQueueSend,
  },
};

// Helper to create a mock NextRequest
function createMockRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/votes/vote-123", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to create mock poll previous document
function createPreviousPoll(
  checkId: string,
  category: string | null,
  downvoted: boolean
) {
  return {
    _id: "poll-001",
    checkId,
    crowdSourcedCategory: category,
    shortformResponse: {
      en: "Test response",
      cn: null,
      downvoted,
      links: [],
      timestamp: new Date(),
    },
  };
}

describe("Poll Update Queue - Route Handler Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: authenticated user
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", telegramId: "123456", name: "Test User" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default mock: getCloudflareContext returns our mock env
    vi.mocked(getCloudflareContext).mockReturnValue({ env: mockEnv } as any);

    // Default mock: findOneVote returns a valid vote
    mockFindOneVote.mockResolvedValue({
      success: true,
      data: {
        _id: "vote-123",
        pollId: "poll-001",
        checkerId: "checker-001",
        category: null,
      },
    });

    // Default mock: updateOneVote succeeds
    mockUpdateOneVote.mockResolvedValue({
      success: true,
      modifiedCount: 1,
    });
  });

  describe("Queue triggered on first assessment", () => {
    it("should send queue message when poll is first assessed (category null -> scam)", async () => {
      // Setup: Poll not yet assessed
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", null, false),
      });

      // Setup: voteAssessment returns assessed result
      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: false },
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "scam",
        isCommunityNoteDownvoted: false,
      });
    });
  });

  describe("Queue triggered on category change", () => {
    it("should send queue message when category changes (scam -> illicit)", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "illicit", truthScore: null, isDownvoted: false },
      });

      const request = createMockRequest({ category: "illicit" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "illicit",
        isCommunityNoteDownvoted: false,
      });
    });

    it("should NOT send queue message when category stays the same", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: false },
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).not.toHaveBeenCalled();
    });
  });

  describe("Queue triggered on downvote status change", () => {
    it("should send queue message when downvoted changes (false -> true)", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: true },
      });

      const request = createMockRequest({ category: "scam", responseCategory: "unacceptable" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "scam",
        isCommunityNoteDownvoted: true,
      });
    });

    it("should send queue message when downvoted changes (true -> false)", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", true),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: false },
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "scam",
        isCommunityNoteDownvoted: false,
      });
    });

    it("should NOT send queue message when downvoted stays the same", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", true),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: true },
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).not.toHaveBeenCalled();
    });
  });

  describe("Queue triggered on both changes", () => {
    it("should send queue message when both category and downvoted change", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", "scam", false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "illicit", truthScore: null, isDownvoted: true },
      });

      const request = createMockRequest({ category: "illicit" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "illicit",
        isCommunityNoteDownvoted: true,
      });
    });
  });

  describe("No queue when poll not yet assessed", () => {
    it("should NOT send queue message when voteAssessment returns null (not enough votes)", async () => {
      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: null, // Not yet assessed
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockUpdateOnePoll).not.toHaveBeenCalled();
      expect(mockQueueSend).not.toHaveBeenCalled();
    });
  });

  describe("Queue error handling", () => {
    it("should not fail request if queue send fails", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("check-001", null, false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: false },
      });

      // Queue send throws error
      mockQueueSend.mockRejectedValue(new Error("Queue unavailable"));

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      // Request should still succeed
      expect(response.status).toBe(201);
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle missing shortformResponse in previousDocument", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: {
          _id: "poll-001",
          checkId: "check-001",
          crowdSourcedCategory: "scam",
          // shortformResponse is missing
        },
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: true },
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      // downvoted defaults to false, so true is a change
      expect(mockQueueSend).toHaveBeenCalledTimes(1);
      expect(mockQueueSend).toHaveBeenCalledWith({
        id: "check-001",
        isHumanAssessed: true,
        crowdsourcedCategory: "scam",
        isCommunityNoteDownvoted: true,
      });
    });

    it("should use correct checkId in queue payload", async () => {
      mockUpdateOnePoll.mockResolvedValue({
        success: true,
        modifiedCount: 1,
        previousDocument: createPreviousPoll("unique-check-id-xyz", null, false),
      });

      vi.mocked(voteAssessment).mockResolvedValue({
        success: true,
        data: { primaryCategory: "scam", truthScore: null, isDownvoted: false },
      });

      const request = createMockRequest({ category: "scam" });
      await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(mockQueueSend).toHaveBeenCalledWith(
        expect.objectContaining({ id: "unique-check-id-xyz" })
      );
    });
  });
});
