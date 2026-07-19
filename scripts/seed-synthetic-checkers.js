#!/usr/bin/env node

/**
 * Seed (and clean up) synthetic checkers for testing vote distribution in staging.
 *
 * Every document this script creates carries `isSynthetic: true` and a
 * `synthetic-` name prefix so it can be removed or deactivated in one command.
 *
 * Usage:
 *   MONGODB_CONNECTION_STRING="<staging uri>" node scripts/seed-synthetic-checkers.js seed [--real-telegram-id <id>] [--bulk <n>]
 *   MONGODB_CONNECTION_STRING="<staging uri>" node scripts/seed-synthetic-checkers.js deactivate
 *   MONGODB_CONNECTION_STRING="<staging uri>" node scripts/seed-synthetic-checkers.js cleanup
 *
 * Groups seeded:
 *   real    - deliver to a real Telegram account (only if --real-telegram-id given); tests the happy path end-to-end
 *   poison  - invalid telegram IDs; the send step fails, exercising rollback
 *   bulk    - N checkers (default 35) with varied budgets; makes the top-30 ranking observable.
 *             Their telegram IDs are fake too, so their assignments also roll back by design:
 *             selection behaviour is verified from the webhook response tallies/contexts, not
 *             from surviving votes, and their budget counters stay at the seeded values.
 *   receive-all - targetDailyVotes 100 (the sentinel), fake IDs; must be included in
 *             every initial distribution, including the out-of-window top-N phase
 *   at-cap  - dailyAssignmentCount == targetDailyVotes; must never be selected
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const DB_NAME = "checkmate-checkers-app";

// Values with & or = break shell sourcing, so read .env.staging directly
// instead of relying on exported vars.
function loadEnvFile() {
  const path = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.staging");
  try {
    return Object.fromEntries(
      readFileSync(path, "utf-8")
        .split("\n")
        .filter(line => line.includes("=") && !line.trimStart().startsWith("#"))
        .map(line => {
          const [key, ...rest] = line.split("=");
          return [
            key.trim(),
            rest
              .join("=")
              .trim()
              .replace(/^["']|["']$/g, ""),
          ];
        })
    );
  } catch {
    return {};
  }
}

const envFile = loadEnvFile();
const uri =
  process.env.MONGODB_CONNECTION_STRING ??
  process.env.MONGODB_URI ??
  envFile.MONGODB_CONNECTION_STRING ??
  envFile.MONGODB_URI;
if (!uri) {
  console.error(
    "No MongoDB URI found: set MONGODB_CONNECTION_STRING / MONGODB_URI, or put MONGODB_URI in .env.staging."
  );
  process.exit(1);
}

// This script inserts and deletes checker documents — never point it at prod.
let uriHost = "";
try {
  uriHost = new URL(uri).host;
} catch {}
if (!/staging|local/i.test(uriHost) && !process.argv.includes("--force")) {
  console.error(
    `Host "${uriHost}" does not look like a staging or local cluster. ` +
      "Pass --force if you are certain this is not production."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const command = args[0];
if (!["seed", "deactivate", "cleanup"].includes(command)) {
  console.error(
    "Usage: node scripts/seed-synthetic-checkers.js <seed|deactivate|cleanup> [options]"
  );
  process.exit(1);
}

function getFlag(name) {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`Flag ${name} requires a value.`);
    process.exit(1);
  }
  return value;
}

const realTelegramId = getFlag("--real-telegram-id");
const bulkCount = parseInt(getFlag("--bulk") ?? "35", 10);
if (!Number.isInteger(bulkCount) || bulkCount < 0) {
  console.error(`Invalid --bulk value: ${getFlag("--bulk")}`);
  process.exit(1);
}

function baseChecker(name, telegramId, overrides = {}) {
  const now = new Date();
  return {
    name: `synthetic-${name}`,
    telegramId,
    telegramUsername: null,
    whatsappId: null,
    singpassId: null,
    isActive: true,
    isOnboardingComplete: true,
    onboardingTime: now,
    isQuizComplete: true,
    quizScore: null,
    onboardingStatus: "completed",
    hasReceivedExtension: false,
    hasCompletedProgramme: false,
    certificateUrl: null,
    lastActivatedDate: now,
    offboardingTime: null,
    lastInactivityWarningSent: null,
    numVoted: 0,
    lastVotedTimestamp: now,
    getNameMessageId: null,
    dailyAssignmentCount: 0,
    currentProgrammeId: null,
    targetDailyVotes: 10,
    isSynthetic: true,
    ...overrides,
  };
}

function buildCheckers() {
  const checkers = [];

  if (realTelegramId) {
    // Real deliveries to your own Telegram account: one small budget, one
    // default, one receive-all sentinel (100).
    checkers.push(baseChecker("real-low", realTelegramId, { targetDailyVotes: 5 }));
    checkers.push(baseChecker("real-default", realTelegramId));
    checkers.push(baseChecker("real-all", realTelegramId, { targetDailyVotes: 100 }));
  }

  // Telegram IDs that no chat answers to -> sendMessage fails -> rollback path.
  checkers.push(baseChecker("poison-1", "999999999991"));
  checkers.push(baseChecker("poison-2", "999999999992"));

  for (let i = 0; i < bulkCount; i++) {
    const target = [5, 10, 20, 30, 50][i % 5];
    const overrides = {
      // Spread of remaining budget so the top-30 sort has something to rank.
      targetDailyVotes: target,
      dailyAssignmentCount: i % 4 === 0 ? Math.min(3, target - 1) : 0,
    };
    const checker = baseChecker(
      `bulk-${String(i + 1).padStart(3, "0")}`,
      `888800000${i}`,
      overrides
    );
    // A couple of legacy-shaped docs with no targetDailyVotes field, to hit
    // the pipelines' $ifNull default of 10. Must be removed after the base
    // defaults are merged in, or the base value survives.
    if (i % 10 === 9) delete checker.targetDailyVotes;
    checkers.push(checker);
  }

  // Receive-all sentinel (fake IDs): must be included in every initial
  // distribution, including the out-of-window top-N phase.
  checkers.push(baseChecker("receive-all-1", "8888777001", { targetDailyVotes: 100 }));
  checkers.push(baseChecker("receive-all-2", "8888777002", { targetDailyVotes: 100 }));

  // Already at cap: must never be assigned.
  checkers.push(
    baseChecker("at-cap", "8889999999", { targetDailyVotes: 5, dailyAssignmentCount: 5 })
  );

  return checkers;
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`Connected to ${uriHost || "(unparseable host)"}, db "${DB_NAME}"`);

  if (command === "seed") {
    const existing = await db.collection("checkers").countDocuments({ isSynthetic: true });
    if (existing > 0) {
      console.error(
        `${existing} synthetic checkers already exist. Run cleanup first to avoid duplicates.`
      );
      process.exit(1);
    }
    const checkers = buildCheckers();
    const result = await db.collection("checkers").insertMany(checkers);
    console.log(`Inserted ${result.insertedCount} synthetic checkers:`);
    for (const c of checkers) {
      console.log(
        `  ${c.name}  telegramId=${c.telegramId}  target=${c.targetDailyVotes ?? "(unset -> 10)"}  used=${c.dailyAssignmentCount}`
      );
    }
    if (!realTelegramId) {
      console.log("\nNote: no --real-telegram-id given, so no happy-path checkers were seeded.");
    }
  } else if (command === "deactivate") {
    const result = await db
      .collection("checkers")
      .updateMany({ isSynthetic: true }, { $set: { isActive: false } });
    console.log(
      `Deactivated ${result.modifiedCount} synthetic checkers (docs kept, excluded from all pipelines).`
    );
  } else if (command === "cleanup") {
    const synthetic = await db
      .collection("checkers")
      .find({ isSynthetic: true }, { projection: { _id: 1 } })
      .toArray();
    const ids = synthetic.map(c => c._id);
    const votes = await db.collection("votes").deleteMany({ checkerId: { $in: ids } });
    const checkers = await db.collection("checkers").deleteMany({ isSynthetic: true });
    console.log(
      `Deleted ${checkers.deletedCount} synthetic checkers and ${votes.deletedCount} of their votes.`
    );
  }
} finally {
  await client.close();
}
