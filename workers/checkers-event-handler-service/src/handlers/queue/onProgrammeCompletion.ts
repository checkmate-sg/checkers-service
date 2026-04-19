import { Bot } from "grammy";

import { MESSAGES } from "../../constants";
import { escapeHtml } from "../../helpers/html";
import type { ProgrammeCompletedData } from "../../types";

/**
 * Handle programme.completed events
 *
 * Marks the checker as graduated and sends the congrats message with a
 * "Claim your certificate" web_app button. Certificate generation happens
 * later, in the certificate.requested handler, once the checker confirms
 * the name they want on the cert.
 */
export async function handleProgrammeCompletion(
  env: Env,
  data: ProgrammeCompletedData
): Promise<void> {
  const { checkerId, programmeId } = data;
  const completionDate = new Date();
  console.log(`Processing programme.completed for checker ${checkerId}, programme ${programmeId}`);

  const checkerResult = await env.CHECKERS_DB_SERVICE.findOneChecker({ _id: checkerId });
  if (!checkerResult.success || !checkerResult.data) {
    console.error(`Checker not found: ${checkerId}`);
    return;
  }
  const checker = checkerResult.data;

  const programmeUpdate = await env.CHECKERS_DB_SERVICE.updateOneProgramme(
    { _id: programmeId },
    {
      $set: {
        status: "completed",
        completedAt: completionDate,
        endDate: completionDate,
      },
    }
  );

  if (!programmeUpdate.success || programmeUpdate.modifiedCount === 0) {
    console.error(`Failed to update programme ${programmeId}`);
    return;
  }

  const checkerUpdate = await env.CHECKERS_DB_SERVICE.updateOneChecker(
    { _id: checkerId },
    {
      $set: {
        currentProgrammeId: null,
        hasCompletedProgramme: true,
      },
    }
  );

  if (!checkerUpdate.success || checkerUpdate.modifiedCount === 0) {
    console.error(`Failed to update checker ${checkerId}`);
    return;
  }

  console.log(`Checker ${checkerId} graduated from programme ${programmeId}`);

  try {
    const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
    const message = MESSAGES.graduation({
      name: escapeHtml(checker.name || "Checker"),
      numMessages: data.stats.voteCount,
      accuracy: data.stats.accuracy,
      numReferred: 0,
      numReported: data.stats.reportCount,
      surveyLink: env.COMPLETED_SURVEY_LINK,
    });

    await bot.api.sendMessage(checker.telegramId, message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Claim your certificate",
              web_app: { url: `${env.HOST_URL}/graduation/claim` },
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
