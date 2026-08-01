import type { Context } from "hono";
import { getParameters } from "@/shared/helpers/parameters";
import { assessQuestion, matchFaq, resolveOutcome } from "./classify";
import { loadFaqs } from "./faq";
import type { FollowingMessage } from "./types";

/**
 * Development-only endpoint for exercising the prompts against the real model.
 *
 * Workers AI has no local simulation — the binding always calls Cloudflare's
 * API, even under `wrangler dev`. That makes prompt iteration cheap and real:
 * run the worker locally, POST a message here, see exactly what both stages say,
 * and read the full prompt/response pair in the AI Gateway log.
 *
 * Never reachable in production: double-gated on ENABLE_EVAL_ENDPOINT (set only
 * in .dev.vars, never in wrangler vars) and the webhook secret.
 */
export async function handleEvalRequest(c: Context<{ Bindings: Env }>) {
  const env = c.env;

  if (env.ENABLE_EVAL_ENDPOINT !== "true") {
    return c.json({ error: "Not found" }, 404);
  }

  // Same fail-open guard as the webhook: an unset secret must not authorise.
  if (
    !env.TELEGRAM_ADMIN_WEBHOOK_SECRET ||
    c.req.header("X-Eval-Secret") !== env.TELEGRAM_ADMIN_WEBHOOK_SECRET
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let body: { message?: string; following?: FollowingMessage[] };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (!body.message) {
    return c.json({ error: "Missing `message`" }, 400);
  }

  const faqs = await loadFaqs(env.CHECKMATE_CHECKERS_PARAMETERS_KV);
  if (faqs.length === 0) {
    return c.json({ error: "No FAQs in KV — run pnpm upload-parameters:local" }, 500);
  }

  const assessment = await assessQuestion(env, body.message, body.following ?? []);
  if (!assessment) {
    return c.json({ error: "Stage 1 failed; see worker logs" }, 502);
  }

  // Same threshold source as the sweep, so the eval reflects what the cron
  // would decide rather than what the code default says.
  const { FAQ_CONFIDENCE_THRESHOLD } = await getParameters(env.CHECKMATE_CHECKERS_PARAMETERS_KV, [
    "FAQ_CONFIDENCE_THRESHOLD",
  ]);

  // Stage 2 only runs for genuine unanswered questions, exactly as in the sweep.
  const needsFaq = assessment.isQuestion && !assessment.alreadyAnswered;
  const match = needsFaq ? await matchFaq(env, body.message, faqs) : null;
  if (needsFaq && !match) {
    return c.json({ error: "Stage 2 failed; see worker logs" }, 502);
  }

  return c.json({
    stage1: assessment,
    outcome: resolveOutcome(assessment, match, FAQ_CONFIDENCE_THRESHOLD),
    stage2: match,
  });
}
