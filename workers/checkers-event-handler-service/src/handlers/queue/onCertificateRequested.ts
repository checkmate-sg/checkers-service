import { Bot } from "grammy";

import { MESSAGES } from "../../constants";
import { generateCertificate } from "../../helpers/generateCertificate";
import { escapeHtml } from "../../helpers/html";
import { generateLinkedInCredentialUrl } from "../../helpers/linkedInCredential";
import type { CertificateRequestedData } from "../../types";

/**
 * Handle certificate.requested events.
 *
 * Fired when a graduated checker submits their preferred name via the miniapp.
 * Generates the certificate, stores the URL, and sends a follow-up Telegram
 * message with View Certificate / Add to LinkedIn buttons.
 */
export async function handleCertificateRequested(
  env: Env,
  data: CertificateRequestedData
): Promise<void> {
  const { checkerId, programmeId } = data;
  console.log(
    `Processing certificate.requested for checker ${checkerId}, programme ${programmeId}`
  );

  const [checkerResult, programmeResult] = await Promise.all([
    env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId }),
    env.CHECKERS_DB_SERVICE.findOneProgramme({ _id: programmeId }),
  ]);

  if (!checkerResult.success || !checkerResult.data) {
    console.error(`Checker not found: ${checkerId}`);
    return;
  }
  if (!programmeResult.success || !programmeResult.data) {
    console.error(`Programme not found: ${programmeId}`);
    return;
  }

  const checker = checkerResult.data;
  const programme = programmeResult.data;

  if (programme.certificateUrl) {
    console.log(`Certificate already issued for programme ${programmeId}; skipping`);
    return;
  }

  if (!programme.certificateName) {
    console.error(`Programme ${programmeId} has no certificateName set`);
    return;
  }

  const completionDate = programme.completedAt ?? new Date();

  const certificateResult = await generateCertificate(env, {
    userName: programme.certificateName,
    programmeId,
    targets: programme.targets,
  });

  if (!certificateResult.success || !certificateResult.url) {
    console.error(`Failed to generate certificate: ${certificateResult.error}`);
    return;
  }

  const [progUpdate, checkerUpdate] = await Promise.all([
    env.CHECKERS_DB_SERVICE.updateOneProgramme(
      { _id: programmeId },
      { $set: { certificateUrl: certificateResult.url } }
    ),
    env.CHECKERS_DB_SERVICE.updateOneChecker(
      { _id: checkerId },
      { $set: { certificateUrl: certificateResult.url } }
    ),
  ]);
  if (!progUpdate.success) {
    console.error(
      `Failed to persist certificateUrl on programme ${programmeId}: ${progUpdate.error ?? "unknown"}`
    );
  }
  if (!checkerUpdate.success) {
    console.error(
      `Failed to persist certificateUrl on checker ${checkerId}: ${checkerUpdate.error ?? "unknown"}`
    );
  }

  const linkedInCredentialUrl = generateLinkedInCredentialUrl({
    certificateUrl: certificateResult.url,
    programmeId,
    completionDate,
    linkedInOrgId: env.LINKEDIN_ORG_ID,
  });

  try {
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    await bot.api.sendMessage(
      checker.telegramId,
      MESSAGES.certificateReady(escapeHtml(checker.name || "Checker")),
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "View your certificate!", url: certificateResult.url },
              { text: "Add certificate to LinkedIn", url: linkedInCredentialUrl },
            ],
          ],
        },
      }
    );
    console.log(`Sent certificate ready message to checker ${checkerId}`);
  } catch (err) {
    console.error(`Failed to send certificate ready message: ${err}`);
  }
}
