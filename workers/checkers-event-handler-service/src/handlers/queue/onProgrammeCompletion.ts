import { Bot } from "grammy";

import { MESSAGES } from "../../constants";
import { generateCertificate } from "../../helpers/generateCertificate";
import { generateLinkedInCredentialUrl } from "../../helpers/linkedInCredential";
import type { ProgrammeCompletedData } from "../../types";

/**
 * Handle programme.completed events
 * Performs all graduation side effects:
 * - Generate certificate and upload to R2
 * - Update programme status to "completed" with certificateUrl
 * - Update checker's currentProgrammeId to null
 * - Send congratulations message (TODO)
 */
export async function handleProgrammeCompletion(
  env: Env,
  data: ProgrammeCompletedData
): Promise<void> {
  const { checkerId, programmeId } = data;
  const completionDate = new Date();
  console.log(`Processing programme.completed for checker ${checkerId}, programme ${programmeId}`);

  // 1. Fetch checker data for certificate
  const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });
  if (!checkerResult.success || !checkerResult.data) {
    console.error(`Checker not found: ${checkerId}`);
    return;
  }

  // 2. Fetch programme data for targets
  const programmeResult = await env.CHECKERS_DB_SERVICE.findOneProgramme({ _id: programmeId });
  if (!programmeResult.success || !programmeResult.data) {
    console.error(`Programme not found: ${programmeId}`);
    return;
  }

  const checker = checkerResult.data;
  const programme = programmeResult.data;

  // 3. Generate certificate
  const certificateResult = await generateCertificate(env, {
    userName: checker.name || "Checker",
    programmeId,
    targets: programme.targets,
  });

  if (!certificateResult.success) {
    console.error(`Failed to generate certificate: ${certificateResult.error}`);
    // Continue with graduation even if certificate fails
  }

  // 4. Update programme status with certificateUrl in single DB call
  const programmeUpdate = await env.CHECKERS_DB_SERVICE.updateOneProgramme(
    { _id: programmeId },
    {
      $set: {
        status: "completed",
        completedAt: completionDate,
        endDate: completionDate,
        ...(certificateResult.url && { certificateUrl: certificateResult.url }),
      },
    }
  );

  if (!programmeUpdate.success || programmeUpdate.modifiedCount === 0) {
    console.error(`Failed to update programme ${programmeId}`);
    return;
  }

  // 5. Update checker
  const checkerUpdate = await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { _id: checkerId },
    {
      $set: {
        currentProgrammeId: null,
        hasCompletedProgramme: true,
        ...(certificateResult.url && { certificateUrl: certificateResult.url }),
      },
    }
  );

  if (!checkerUpdate.success || checkerUpdate.modifiedCount === 0) {
    console.error(`Failed to update checker ${checkerId}`);
    return;
  }

  console.log(`Checker ${checkerId} graduated from programme ${programmeId}`);

  // Generate LinkedIn credential URL only if certificate was successfully created
  let linkedInCredentialUrl: string | null = null;
  if (certificateResult.url) {
    console.log(`Certificate URL: ${certificateResult.url}`);
    linkedInCredentialUrl = generateLinkedInCredentialUrl({
      certificateUrl: certificateResult.url,
      programmeId,
      completionDate,
      linkedInOrgId: env.LINKEDIN_ORG_ID,
    });
    console.log(`LinkedIn credential URL: ${linkedInCredentialUrl}`);
  }

  // 6. Send congratulations message via Telegram
  if (certificateResult.url && linkedInCredentialUrl) {
    try {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
      const message = MESSAGES.graduation({
        name: checker.name || "Checker",
        numMessages: programme.targets.votes,
        accuracy: programme.targets.accuracy,
        numReferred: 0, // Referrals not implemented yet
        numReported: programme.targets.reports,
        surveyLink: env.COMPLETED_SURVEY_LINK,
      });

      await bot.api.sendMessage(checker.telegramId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "View your certificate!",
                url: certificateResult.url,
              },
              {
                text: "Add certificate to LinkedIn",
                url: linkedInCredentialUrl,
              },
            ],
          ],
        },
      });

      console.log(`Sent graduation message to checker ${checkerId}`);
    } catch (err) {
      console.error(`Failed to send graduation message: ${err}`);
    }
  }
}
