import { checkGraduation } from "@/shared/helpers/checkGraduation";

/**
 * Daily sweep: re-evaluate graduation for all active/extended programmes.
 *
 * Needed because graduation is otherwise only triggered by `vote.scoreChanged`,
 * which doesn't fire when the crossing target is reports (reports live in the
 * WhatsApp service and don't produce events here). Running this before the
 * programme extension/offboarding cron ensures eligible checkers graduate
 * instead of being offboarded at day 90.
 */
export async function runGraduationSweep(env: Env): Promise<void> {
  console.log("Running graduation sweep...");

  const result = await env.CHECKERS_DB_SERVICE.findProgrammes({
    status: { $in: ["active", "extended"] },
  });

  if (!result.success || !result.data) {
    console.error(`Graduation sweep: failed to fetch programmes: ${result.error}`);
    return;
  }

  let graduated = 0;
  let errored = 0;

  for (const programme of result.data) {
    try {
      const gradResult = await checkGraduation(env, programme.checkerId);
      if (!gradResult.success) {
        errored++;
        console.error(
          `Graduation sweep error for checker ${programme.checkerId}: ${gradResult.error}`
        );
        continue;
      }
      if (gradResult.graduated) {
        graduated++;
      }
    } catch (err) {
      errored++;
      console.error(`Graduation sweep exception for checker ${programme.checkerId}:`, err);
    }
  }

  console.log(
    `Graduation sweep complete: scanned ${result.data.length}, graduated ${graduated}, errored ${errored}`
  );
}
