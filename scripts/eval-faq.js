#!/usr/bin/env node

/**
 * Run the FAQ prompts against the real model and score them.
 *
 * Workers AI has no local simulation — even under `wrangler dev` the AI binding
 * calls Cloudflare's API against your account. So this is a real evaluation, not
 * a mock: it exercises the exact prompts the cron uses, and every call shows up
 * in the AI Gateway log for the configured gateway.
 *
 * Usage:
 *   1. cd workers/checkers-chat-management-service && pnpm dev
 *   2. node scripts/eval-faq.js
 *
 * Requires ENABLE_EVAL_ENDPOINT=true and TELEGRAM_ADMIN_WEBHOOK_SECRET in that
 * worker's .dev.vars, and the FAQ set uploaded (pnpm upload-parameters:local).
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const ENDPOINT = process.env.EVAL_ENDPOINT ?? "http://localhost:9084/dev/classify";

function readSecret() {
  if (process.env.EVAL_SECRET) return process.env.EVAL_SECRET;
  const devVars = join(ROOT, "workers", "checkers-chat-management-service", ".dev.vars");
  const line = readFileSync(devVars, "utf-8")
    .split("\n")
    .find(l => l.startsWith("TELEGRAM_ADMIN_WEBHOOK_SECRET="));
  if (!line) {
    console.error("TELEGRAM_ADMIN_WEBHOOK_SECRET not found in .dev.vars");
    process.exit(1);
  }
  // Values can contain "=", so split on the first one only.
  return line.slice(line.indexOf("=") + 1).trim();
}

/** Compare only the fields a case actually asserts — cases may check stage 1 alone. */
function checkCase(expected, actual) {
  const failures = [];

  if (expected.isQuestion !== undefined && actual.stage1.isQuestion !== expected.isQuestion) {
    failures.push(`isQuestion: expected ${expected.isQuestion}, got ${actual.stage1.isQuestion}`);
  }

  if (
    expected.alreadyAnswered !== undefined &&
    actual.stage1.alreadyAnswered !== expected.alreadyAnswered
  ) {
    failures.push(
      `alreadyAnswered: expected ${expected.alreadyAnswered}, got ${actual.stage1.alreadyAnswered}`
    );
  }

  if (expected.faqId !== undefined) {
    const gotFaqId = actual.stage2?.faqId ?? "(stage 2 not reached)";
    if (gotFaqId !== expected.faqId) {
      failures.push(`faqId: expected "${expected.faqId}", got "${gotFaqId}"`);
    }
  }

  return failures;
}

const { cases } = JSON.parse(readFileSync(join(ROOT, "tests", "eval", "faq-cases.json"), "utf-8"));
const secret = readSecret();

console.log(`Running ${cases.length} cases against ${ENDPOINT}\n`);

let passed = 0;
const failures = [];

for (const testCase of cases) {
  let result;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Eval-Secret": secret },
      body: JSON.stringify({ message: testCase.message, following: testCase.following ?? [] }),
    });
    result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
  } catch (error) {
    console.log(`✗ ${testCase.name}\n    request failed: ${error.message}\n`);
    failures.push(testCase.name);
    continue;
  }

  const caseFailures = checkCase(testCase.expect, result);

  if (caseFailures.length === 0) {
    passed += 1;
    console.log(`✓ ${testCase.name}  → ${result.outcome}`);
  } else {
    failures.push(testCase.name);
    console.log(`✗ ${testCase.name}  → ${result.outcome}`);
    for (const failure of caseFailures) console.log(`    ${failure}`);
    if (result.stage2?.answer) console.log(`    drafted: ${result.stage2.answer}`);
  }
}

console.log(`\n${passed}/${cases.length} passed`);

if (failures.length > 0) {
  console.log(`\nFailed: ${failures.join(", ")}`);
  console.log(
    "\nA failure means the model and the expectation disagree. Decide which is " +
      "wrong before changing either — the expectations encode judgement calls."
  );
  process.exit(1);
}
