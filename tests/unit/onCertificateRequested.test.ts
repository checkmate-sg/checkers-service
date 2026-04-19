import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessageMock, generateCertificateMock, generateLinkedInCredentialUrlMock } = vi.hoisted(
  () => ({
    sendMessageMock: vi.fn(),
    generateCertificateMock: vi.fn(),
    generateLinkedInCredentialUrlMock: vi.fn(),
  })
);

vi.mock("grammy", () => ({
  Bot: class {
    api = { sendMessage: sendMessageMock };
  },
}));

vi.mock("../../workers/checkers-event-handler-service/src/helpers/generateCertificate", () => ({
  generateCertificate: generateCertificateMock,
}));

vi.mock("../../workers/checkers-event-handler-service/src/helpers/linkedInCredential", () => ({
  generateLinkedInCredentialUrl: generateLinkedInCredentialUrlMock,
}));

import { handleCertificateRequested } from "../../workers/checkers-event-handler-service/src/handlers/queue/onCertificateRequested";

const mockFindOneChecker = vi.fn();
const mockFindOneProgramme = vi.fn();
const mockUpdateOneChecker = vi.fn();
const mockUpdateOneProgramme = vi.fn();

const env = {
  TELEGRAM_BOT_TOKEN: "test-bot",
  LINKEDIN_ORG_ID: "42",
  CHECKERS_DB_SERVICE: {
    findOneChecker: mockFindOneChecker,
    findOneProgramme: mockFindOneProgramme,
    updateOneChecker: mockUpdateOneChecker,
    updateOneProgramme: mockUpdateOneProgramme,
  },
} as unknown as Env;

const data = { checkerId: "checker-001", programmeId: "programme-001" };

const baseProgramme = {
  _id: "programme-001",
  certificateUrl: null,
  certificateName: "Alice Smith",
  completedAt: new Date("2026-04-01"),
  targets: { votes: 50, accuracy: 60, reports: 10 },
};

describe("handleCertificateRequested", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOneChecker.mockResolvedValue({
      success: true,
      data: { _id: "checker-001", name: "Alice", telegramId: "123456" },
    });
    mockFindOneProgramme.mockResolvedValue({ success: true, data: baseProgramme });
    mockUpdateOneProgramme.mockResolvedValue({ success: true, modifiedCount: 1 });
    mockUpdateOneChecker.mockResolvedValue({ success: true, modifiedCount: 1 });
    generateCertificateMock.mockResolvedValue({
      success: true,
      url: "https://r2.example/programme-001.html",
    });
    generateLinkedInCredentialUrlMock.mockReturnValue("https://linkedin.example/cred");
    sendMessageMock.mockResolvedValue(undefined);
  });

  it("generates the certificate using programme.certificateName", async () => {
    await handleCertificateRequested(env, data);

    expect(generateCertificateMock).toHaveBeenCalledWith(env, {
      userName: "Alice Smith",
      programmeId: "programme-001",
      targets: baseProgramme.targets,
    });
  });

  it("writes certificateUrl to both programme and checker", async () => {
    await handleCertificateRequested(env, data);

    expect(mockUpdateOneProgramme).toHaveBeenCalledWith(
      { _id: "programme-001" },
      { $set: { certificateUrl: "https://r2.example/programme-001.html" } }
    );
    expect(mockUpdateOneChecker).toHaveBeenCalledWith(
      { _id: "checker-001" },
      { $set: { certificateUrl: "https://r2.example/programme-001.html" } }
    );
  });

  it("sends the certificate-ready Telegram message with both buttons", async () => {
    await handleCertificateRequested(env, data);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const [, , options] = sendMessageMock.mock.calls[0];
    const buttons = options.reply_markup.inline_keyboard[0];
    expect(buttons).toEqual([
      { text: "View your certificate!", url: "https://r2.example/programme-001.html" },
      { text: "Add certificate to LinkedIn", url: "https://linkedin.example/cred" },
    ]);
  });

  it("skips generation if programme already has a certificateUrl", async () => {
    mockFindOneProgramme.mockResolvedValue({
      success: true,
      data: { ...baseProgramme, certificateUrl: "https://existing.example/cert.html" },
    });

    await handleCertificateRequested(env, data);

    expect(generateCertificateMock).not.toHaveBeenCalled();
    expect(mockUpdateOneProgramme).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it("refuses to generate if certificateName is missing", async () => {
    mockFindOneProgramme.mockResolvedValue({
      success: true,
      data: { ...baseProgramme, certificateName: null },
    });

    await handleCertificateRequested(env, data);

    expect(generateCertificateMock).not.toHaveBeenCalled();
  });

  it("aborts without updating fields if cert generation fails", async () => {
    generateCertificateMock.mockResolvedValue({ success: false, error: "R2 down" });

    await handleCertificateRequested(env, data);

    expect(mockUpdateOneProgramme).not.toHaveBeenCalled();
    expect(mockUpdateOneChecker).not.toHaveBeenCalled();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
