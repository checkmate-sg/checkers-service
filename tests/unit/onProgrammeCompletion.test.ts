import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessageMock, generateCertificateMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
  generateCertificateMock: vi.fn(),
}));

vi.mock("grammy", () => ({
  Bot: class {
    api = { sendMessage: sendMessageMock };
  },
}));

vi.mock("../../workers/checkers-event-handler-service/src/helpers/generateCertificate", () => ({
  generateCertificate: generateCertificateMock,
}));

import { handleProgrammeCompletion } from "../../workers/checkers-event-handler-service/src/handlers/queue/onProgrammeCompletion";

const mockFindOneChecker = vi.fn();
const mockUpdateOneChecker = vi.fn();
const mockUpdateOneProgramme = vi.fn();

const env = {
  TELEGRAM_BOT_TOKEN: "test-bot",
  COMPLETED_SURVEY_LINK: "https://survey.example/done",
  HOST_URL: "https://checkers.example",
  CHECKERS_DB_SERVICE: {
    findOneChecker: mockFindOneChecker,
    updateOneChecker: mockUpdateOneChecker,
    updateOneProgramme: mockUpdateOneProgramme,
  },
} as unknown as Env;

const data = {
  checkerId: "checker-001",
  programmeId: "programme-001",
  stats: { voteCount: 55, accuracy: 75, reportCount: 12 },
};

describe("handleProgrammeCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOneChecker.mockResolvedValue({
      success: true,
      data: { _id: "checker-001", name: "Alice", telegramId: "123456" },
    });
    mockUpdateOneProgramme.mockResolvedValue({ success: true, modifiedCount: 1 });
    mockUpdateOneChecker.mockResolvedValue({ success: true, modifiedCount: 1 });
    sendMessageMock.mockResolvedValue(undefined);
  });

  it("marks the programme as completed without generating a certificate", async () => {
    await handleProgrammeCompletion(env, data);

    expect(generateCertificateMock).not.toHaveBeenCalled();
    expect(mockUpdateOneProgramme).toHaveBeenCalledWith(
      { _id: "programme-001" },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Date),
          endDate: expect.any(Date),
        }),
      })
    );
    const programmeSet = mockUpdateOneProgramme.mock.calls[0][1].$set;
    expect(programmeSet).not.toHaveProperty("certificateUrl");
  });

  it("nulls currentProgrammeId and marks the checker as completed", async () => {
    await handleProgrammeCompletion(env, data);

    expect(mockUpdateOneChecker).toHaveBeenCalledWith(
      { _id: "checker-001" },
      {
        $set: {
          currentProgrammeId: null,
          hasCompletedProgramme: true,
        },
      }
    );
  });

  it("sends a Telegram message with a web_app claim button", async () => {
    await handleProgrammeCompletion(env, data);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const [telegramId, , options] = sendMessageMock.mock.calls[0];
    expect(telegramId).toBe("123456");
    expect(options.reply_markup.inline_keyboard).toEqual([
      [
        {
          text: "Claim your certificate",
          web_app: { url: "https://checkers.example/graduation/claim" },
        },
      ],
    ]);
  });

  it("short-circuits when checker lookup fails", async () => {
    mockFindOneChecker.mockResolvedValue({ success: false, data: null });

    await handleProgrammeCompletion(env, data);

    expect(mockUpdateOneProgramme).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
