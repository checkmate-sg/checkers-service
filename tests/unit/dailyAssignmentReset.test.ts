import { describe, it, expect, vi, beforeEach } from "vitest";

import { runDailyAssignmentReset } from "../../workers/checkers-event-handler-service/src/handlers/scheduled/dailyAssignment";

const mockUpdateManyCheckers = vi.fn();

const mockEnv = {
  CHECKERS_DB_SERVICE: {
    updateManyCheckers: mockUpdateManyCheckers,
  },
} as unknown as Env;

describe("runDailyAssignmentReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets counts for checkers selected by isOnboardingComplete, not onboardingStatus", async () => {
    // Regression guard for the v1.0.13 incident: selecting on
    // onboardingStatus: "completed" silently dropped legacy checkers whose
    // docs carry statuses like "number" or "offboarded" while
    // isOnboardingComplete is true.
    mockUpdateManyCheckers.mockResolvedValue({ success: true, modifiedCount: 77 });

    await runDailyAssignmentReset(mockEnv);

    expect(mockUpdateManyCheckers).toHaveBeenCalledExactlyOnceWith(
      { isActive: true, isOnboardingComplete: true },
      { $set: { dailyAssignmentCount: 0 } }
    );
    const [filter] = mockUpdateManyCheckers.mock.calls[0];
    expect(filter).not.toHaveProperty("onboardingStatus");
  });

  it("logs and returns on failure without reporting success", async () => {
    mockUpdateManyCheckers.mockResolvedValue({ success: false, error: "boom" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runDailyAssignmentReset(mockEnv);

    expect(errorSpy).toHaveBeenCalledWith("failed to reset daily assignment:", "boom");
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("successfully reset daily assignment")
    );
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
