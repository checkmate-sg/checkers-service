import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/helpers/events/publishCheckersEvent", () => ({
  publishCheckersEvent: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));

import { POST } from "@/app/api/checkers/[checkerId]/certificate/route";
import { auth } from "@/auth";
import { publishCheckersEvent } from "@/lib/helpers/events/publishCheckersEvent";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const mockFindProgrammes = vi.fn();
const mockUpdateOneProgramme = vi.fn();

const mockEnv = {
  CHECKERS_DB_SERVICE: {
    findProgrammes: mockFindProgrammes,
    updateOneProgramme: mockUpdateOneProgramme,
  },
};

function buildRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/checkers/checker-001/certificate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/checkers/[checkerId]/certificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({
      user: { id: "checker-001", telegramId: "123456", name: "Alice" },
      expires: new Date(Date.now() + 86400000).toISOString(),
    });
    vi.mocked(getCloudflareContext).mockReturnValue({ env: mockEnv } as any);

    mockFindProgrammes.mockResolvedValue({
      success: true,
      data: [
        {
          _id: "programme-001",
          status: "completed",
          certificateUrl: null,
          completedAt: new Date("2026-04-01"),
        },
      ],
    });
    mockUpdateOneProgramme.mockResolvedValue({ success: true, modifiedCount: 1 });
    vi.mocked(publishCheckersEvent).mockResolvedValue({ success: true });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const res = await POST(buildRequest({ name: "Alice" }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the session user is not the target checker", async () => {
    const res = await POST(buildRequest({ name: "Alice" }), {
      params: Promise.resolve({ checkerId: "another-checker" }),
    });
    expect(res.status).toBe(403);
  });

  it("rejects empty names", async () => {
    const res = await POST(buildRequest({ name: "   " }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdateOneProgramme).not.toHaveBeenCalled();
  });

  it("rejects names longer than 100 characters", async () => {
    const res = await POST(buildRequest({ name: "a".repeat(101) }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the checker has no pending completed programme", async () => {
    mockFindProgrammes.mockResolvedValue({ success: true, data: [] });
    const res = await POST(buildRequest({ name: "Alice Smith" }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(404);
    expect(mockUpdateOneProgramme).not.toHaveBeenCalled();
  });

  it("queues a certificate.requested event on success", async () => {
    const res = await POST(buildRequest({ name: "  Alice Smith  " }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });

    expect(res.status).toBe(202);
    expect(mockFindProgrammes).toHaveBeenCalledWith(
      { checkerId: "checker-001", status: "completed", certificateUrl: null },
      { sort: { completedAt: -1 } }
    );
    expect(mockUpdateOneProgramme).toHaveBeenCalledWith(
      { _id: "programme-001", certificateUrl: null },
      { $set: { certificateName: "Alice Smith" } }
    );
    expect(publishCheckersEvent).toHaveBeenCalledWith(
      mockEnv,
      expect.objectContaining({
        type: "certificate.requested",
        data: { checkerId: "checker-001", programmeId: "programme-001" },
      })
    );
  });

  it("returns 409 if the programme was already claimed (race)", async () => {
    mockUpdateOneProgramme.mockResolvedValue({ success: true, modifiedCount: 0 });
    const res = await POST(buildRequest({ name: "Alice Smith" }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 500 if publishing the event fails", async () => {
    vi.mocked(publishCheckersEvent).mockResolvedValue({ success: false, error: "queue down" });
    const res = await POST(buildRequest({ name: "Alice Smith" }), {
      params: Promise.resolve({ checkerId: "checker-001" }),
    });
    expect(res.status).toBe(500);
  });
});
