import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockCheckers, mockPoll } from "../fixtures/mockData";

/**
 * Integration tests for the poll webhook flow
 *
 * These tests mock the database service and Telegram API
 * to test the full webhook flow without external dependencies.
 */

// Mock Cloudflare context
const mockDbService = {
  findOnePoll: vi.fn(),
  insertPoll: vi.fn(),
  findCheckers: vi.fn(),
  insertVote: vi.fn(),
};

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(() => ({
    env: {
      CHECKERS_DB_SERVICE: mockDbService,
    },
  })),
}));

// Mock Telegram helpers
vi.mock("@/lib/telegramHelpers/telegram", () => ({
  sendMessage: vi.fn().mockResolvedValue({ ok: true }),
  createInlineKeyboard: vi.fn().mockReturnValue({ inline_keyboard: [] }),
}));

describe("POST /api/polls/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockDbService.findOnePoll.mockResolvedValue({ success: true, data: null });
    mockDbService.insertPoll.mockResolvedValue({ success: true, id: "poll-001" });
    mockDbService.findCheckers.mockResolvedValue({ success: true, data: mockCheckers });
    mockDbService.insertVote.mockResolvedValue({ success: true, id: "vote-001" });
  });

  describe("Validation", () => {
    it("should reject request without checkId", async () => {
      const { POST } = await import("@/app/api/polls/webhook/route");

      const request = new Request("http://localhost:3002/api/polls/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Some text",
          shortformResponse: { en: "Response", cn: "", links: [], timestamp: new Date() },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("checkId");
    });

    it("should reject request with both text and imageUrl", async () => {
      const { POST } = await import("@/app/api/polls/webhook/route");

      const request = new Request("http://localhost:3002/api/polls/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId: "check-001",
          text: "Some text",
          imageUrl: "http://example.com/image.jpg",
          shortformResponse: { en: "Response", cn: "", links: [], timestamp: new Date() },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("mutually exclusive");
    });
  });

  describe("Poll Creation", () => {
    it("should create poll and votes for all active checkers", async () => {
      const { POST } = await import("@/app/api/polls/webhook/route");

      const request = new Request("http://localhost:3002/api/polls/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId: "check-001",
          text: "Is this claim true?",
          shortformResponse: {
            en: "This claim is false.",
            cn: "此说法是错误的。",
            downvoted: false,
            links: [],
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Poll created successfully");
      expect(data.id).toBe("poll-001");

      // Verify poll was created
      expect(mockDbService.insertPoll).toHaveBeenCalledTimes(1);

      // Verify votes were created for all checkers
      expect(mockDbService.insertVote).toHaveBeenCalledTimes(mockCheckers.length);
    });

    it("should reject duplicate polls", async () => {
      mockDbService.findOnePoll.mockResolvedValue({
        success: true,
        data: { _id: "existing-poll", externalId: "check-001" },
      });

      const { POST } = await import("@/app/api/polls/webhook/route");

      const request = new Request("http://localhost:3002/api/polls/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId: "check-001",
          text: "Is this claim true?",
          shortformResponse: { en: "Response", cn: "", links: [], timestamp: new Date() },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already exists");
    });
  });

  describe("Response Structure", () => {
    it("should store default null values for missing responses", async () => {
      const { POST } = await import("@/app/api/polls/webhook/route");

      const request = new Request("http://localhost:3002/api/polls/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId: "check-001",
          text: "Is this claim true?",
          // Only shortformResponse provided
          shortformResponse: {
            en: "Response",
            cn: "回应",
            downvoted: false,
            links: [],
            timestamp: new Date().toISOString(),
          },
        }),
      });

      await POST(request);

      // Check the poll was created with proper default structures
      const insertedPoll = mockDbService.insertPoll.mock.calls[0][0];

      expect(insertedPoll.longformResponse).toEqual({
        en: null,
        cn: null,
        links: null,
        timestamp: null,
      });

      expect(insertedPoll.humanResponse).toEqual({
        en: null,
        cn: null,
        links: null,
        timestamp: null,
        updatedBy: null,
      });
    });
  });
});
