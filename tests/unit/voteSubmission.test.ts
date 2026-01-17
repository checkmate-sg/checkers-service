import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before importing the route handler
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/helpers/events/publishCheckersEvent", () => ({
  publishCheckersEvent: vi.fn(),
  createVoteSubmittedEvent: vi.fn(data => ({
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
import {
  publishCheckersEvent,
  createVoteSubmittedEvent,
} from "@/lib/helpers/events/publishCheckersEvent";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Mock DB service functions
const mockUpdateOneVote = vi.fn();

// Setup mock env
const mockEnv = {
  CHECKERS_DB_SERVICE: {
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
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(201);

      // Vote should be updated
      expect(mockUpdateOneVote).toHaveBeenCalledTimes(1);
      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "scam",
            votedTimestamp: expect.any(Date),
          }),
        })
      );

      // Event should be published
      expect(createVoteSubmittedEvent).toHaveBeenCalledWith({
        voteId: "vote-123",
      });
      expect(publishCheckersEvent).toHaveBeenCalledTimes(1);
    });

    it("should include truthScore in update when provided", async () => {
      const request = createMockRequest({ category: "info", truthScore: 3 });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

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
      const request = createMockRequest({
        category: "scam",
        responseCategory: "acceptable",
      });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

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

    it("should include commentOnResponse in update when provided", async () => {
      const request = createMockRequest({
        category: "scam",
        commentOnResponse: "This response could be improved",
      });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(201);
      expect(mockUpdateOneVote).toHaveBeenCalledWith(
        { _id: "vote-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            category: "scam",
            commentOnResponse: "This response could be improved",
          }),
        })
      );
    });

    it("should set votedTimestamp to current time", async () => {
      const beforeRequest = new Date();

      const request = createMockRequest({ category: "scam" });
      await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      const afterRequest = new Date();

      const calledWith = mockUpdateOneVote.mock.calls[0][1];
      const votedTimestamp = calledWith.$set.votedTimestamp;

      expect(votedTimestamp.getTime()).toBeGreaterThanOrEqual(beforeRequest.getTime());
      expect(votedTimestamp.getTime()).toBeLessThanOrEqual(afterRequest.getTime());
    });
  });

  describe("Event publishing behavior", () => {
    it("should still succeed if event publishing fails", async () => {
      vi.mocked(publishCheckersEvent).mockResolvedValue({
        success: false,
        error: "Queue unavailable",
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      // Request should still succeed
      expect(response.status).toBe(201);
      expect(publishCheckersEvent).toHaveBeenCalledTimes(1);
    });

    it("should pass correct event to publishCheckersEvent", async () => {
      const request = createMockRequest({ category: "scam" });
      await POST(request, { params: Promise.resolve({ voteId: "vote-123" }) });

      expect(createVoteSubmittedEvent).toHaveBeenCalledWith({
        voteId: "vote-123",
      });
      expect(publishCheckersEvent).toHaveBeenCalledWith(
        mockEnv,
        expect.objectContaining({
          type: "vote.submitted",
          data: { voteId: "vote-123" },
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should return 400 if body is empty", async () => {
      const request = createMockRequest({});
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(400);
      expect(mockUpdateOneVote).not.toHaveBeenCalled();
    });

    it("should return 500 if update fails", async () => {
      mockUpdateOneVote.mockResolvedValue({
        success: false,
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(500);
      expect(publishCheckersEvent).not.toHaveBeenCalled();
    });

    it("should return 404 if no document was modified", async () => {
      mockUpdateOneVote.mockResolvedValue({
        success: true,
        modifiedCount: 0,
      });

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(404);
      expect(publishCheckersEvent).not.toHaveBeenCalled();
    });

    it("should return 500 if an exception is thrown", async () => {
      mockUpdateOneVote.mockRejectedValue(new Error("Database error"));

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(401);
      expect(mockUpdateOneVote).not.toHaveBeenCalled();
    });

    it("should return 401 if session has no user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: null,
        expires: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      expect(response.status).toBe(401);
      expect(mockUpdateOneVote).not.toHaveBeenCalled();
    });
  });

  describe("Response format", () => {
    it("should return success message with voteId", async () => {
      const request = createMockRequest({ category: "scam" });
      const response = await POST(request, {
        params: Promise.resolve({ voteId: "vote-123" }),
      });

      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({
        message: "Vote successfully updated",
        id: "vote-123",
      });
    });
  });
});
