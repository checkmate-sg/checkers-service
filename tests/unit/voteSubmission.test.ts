import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route handler
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/helpers/events/publishCheckersEvent", () => ({
  publishCheckersEvent: vi.fn(),
  createVoteSubmittedEvent: vi.fn((data) => ({
    type: "vote.submitted",
    data,
    timestamp: new Date().toISOString(),
  })),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

import { POST } from "@/app/api/votes/[voteId]/route";
import { auth } from "@/auth";
import { publishCheckersEvent, createVoteSubmittedEvent } from "@/lib/helpers/events/publishCheckersEvent";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Mock DB service functions
const mockFindOneVote = vi.fn();
const mockUpdateOneVote = vi.fn();

// Setup mock env
const mockEnv = {
  CHECKERS_DB_SERVICE: {
    findOneVote: mockFindOneVote,
    updateOneVote: mockUpdateOneVote,
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

describe("Vote Submission API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: authenticated user
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", telegramId: "123456", name: "Test User" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });

    // Default mock: getCloudflareContext returns our mock env
    vi.mocked(getCloudflareContext).mockReturnValue({ env: mockEnv } as any);

    // Default mock: findOneVote returns a valid vote with timestamps
    mockFindOneVote.mockResolvedValue({
      success: true,
      data: {
        _id: "vote-123",
        pollId: "poll-001",
        checkerId: "checker-001",
        category: null,
        createdTimestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
    });

    // Default mock: updateOneVote succeeds
    mockUpdateOneVote.mockResolvedValue({
      success: true,
      modifiedCount: 1,
    });

    // Default mock: publishCheckersEvent succeeds
    vi.mocked(publishCheckersEvent).mockResolvedValue({ success: true });
  });

  describe("Vote update and event publishing", () => {
    it("should update vote and publish vote.submitted event", async () => {
      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);

      // Vote should be updated
      expect(mockUpdateOneVote).toHaveBeenCalledTimes(1);
      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "scam",
            votedTimestamp: expect.any(Date),
            responseTime: expect.any(Number),
          }),
        })
      );

      // Event should be published
      expect(createVoteSubmittedEvent).toHaveBeenCalledWith({ voteId: "vote-123" });
      expect(publishCheckersEvent).toHaveBeenCalledTimes(1);
    });

    it("should include truthScore in update when provided", async () => {
      const request = createMockRequest({ category: "info", truthScore: 3 });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "info",
            truthScore: 3,
          }),
        })
      );
    });

    it("should include responseCategory in update when provided", async () => {
      const request = createMockRequest({ category: "scam", responseCategory: "acceptable" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(201);
      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "scam",
            responseCategory: "acceptable",
          }),
        })
      );
    });

    it("should calculate responseTime in hours", async () => {
      const createdTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      mockFindOneVote.mockResolvedValue({
        success: true,
        data: {
          _id: "vote-123",
          pollId: "poll-001",
          checkerId: "checker-001",
          category: null,
          createdTimestamp: createdTime.toISOString(),
        },
      });

      const request = createMockRequest({ category: "scam" });
      await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            responseTime: expect.closeTo(2, 0.1), // ~2 hours
          }),
        })
      );
    });
  });

  describe("Event publishing behavior", () => {
    it("should still succeed if event publishing fails", async () => {
      vi.mocked(publishCheckersEvent).mockResolvedValue({
        success: false,
        error: "Queue unavailable"
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      // Request should still succeed
      expect(response.status).toBe(201);
      expect(publishCheckersEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling", () => {
    it("should return 404 if vote not found", async () => {
      mockFindOneVote.mockResolvedValue({
        success: false,
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(404);
      expect(mockUpdateOneVote).not.toHaveBeenCalled();
      expect(publishCheckersEvent).not.toHaveBeenCalled();
    });

    it("should return 400 if body is empty", async () => {
      const request = createMockRequest({});
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(400);
      expect(mockUpdateOneVote).not.toHaveBeenCalled();
    });

    it("should return 500 if update fails", async () => {
      mockUpdateOneVote.mockResolvedValue({
        success: false,
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(500);
    });

    it("should return 404 if no document was modified", async () => {
      mockUpdateOneVote.mockResolvedValue({
        success: true,
        modifiedCount: 0,
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(404);
    });
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(response.status).toBe(401);
      expect(mockFindOneVote).not.toHaveBeenCalled();
    });
  });
});
