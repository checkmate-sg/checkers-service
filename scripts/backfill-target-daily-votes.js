#!/usr/bin/env node

/**
 * Backfill `targetDailyVotes` on existing checkers that don't have the field yet.
 *
 * Context: the vote distribution engine (v1.0.13) caps every checker at
 * `targetDailyVotes` assignments per day, defaulting to 10 when the field is
 * missing. Checkers who predate the feature received every check; run this at
 * release time with --target 100 (the receive-all sentinel, see
 * MAX_TARGET_DAILY_VOTES in shared/constants.ts) to preserve that behaviour and
 * let them opt down via the dashboard's target-load dialog.
 *
 * Only documents where the field is missing or null are touched (mirroring the
 * $ifNull defaulting in the distribution pipelines) — anything a checker has
 * already chosen through the dialog is left alone, so the script is idempotent.
 *
 * Usage:
 *   MONGODB_URI="<uri>" node scripts/backfill-target-daily-votes.js            # dry run (default)
 *   MONGODB_URI="<uri>" node scripts/backfill-target-daily-votes.js --execute  # apply
 *   MONGODB_URI="<uri>" node scripts/backfill-target-daily-votes.js --target 50 --execute
 *
 * The URI must be passed via MONGODB_URI / MONGODB_CONNECTION_STRING explicitly.
 * There is deliberately no .env fallback: this script exists to be run against
 * production, and defaulting to a checked-in staging env file would make it too
 * easy to "backfill prod" against the wrong cluster.
 */

import { MongoClient } from "mongodb";

const DB_NAME = "checkmate-checkers-app";

const uri = process.env.MONGODB_CONNECTION_STRING ?? process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI (or MONGODB_CONNECTION_STRING) to the target cluster's URI.");
  process.exit(1);
}

const args = process.argv.slice(2);
const execute = args.includes("--execute");

const targetIdx = args.indexOf("--target");
const target = targetIdx !== -1 ? Number(args[targetIdx + 1]) : 100;
if (!Number.isInteger(target) || target < 5 || target > 100) {
  console.error(`Invalid --target value: must be an integer between 5 and 100.`);
  process.exit(1);
}

let host = "(unparseable host)";
try {
  host = new URL(uri).host;
} catch {}

// Equality-to-null matches both missing and explicit null, exactly like the
// pipelines' $ifNull.
const filter = { targetDailyVotes: null };

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`Connected to ${host}, db "${DB_NAME}"`);

  const total = await db.collection("checkers").countDocuments({});
  const missing = await db.collection("checkers").countDocuments(filter);
  const missingActive = await db
    .collection("checkers")
    .countDocuments({ ...filter, isActive: true, onboardingStatus: "completed" });

  console.log(`Checkers total: ${total}`);
  console.log(`Missing targetDailyVotes: ${missing} (${missingActive} active + onboarded)`);
  console.log(`Would set targetDailyVotes = ${target} on all ${missing}.`);

  if (execute) {
    const result = await db
      .collection("checkers")
      .updateMany(filter, { $set: { targetDailyVotes: target } });
    console.log(
      `\nMatched ${result.matchedCount}, set targetDailyVotes = ${target} on ${result.modifiedCount} checkers.`
    );
  } else {
    console.log("\nDry run — nothing written. Re-run with --execute to apply.");
  }
} finally {
  await client.close();
}
