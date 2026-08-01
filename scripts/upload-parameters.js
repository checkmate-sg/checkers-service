#!/usr/bin/env node

/**
 * Script to upload parameters from JSON files to Cloudflare KV.
 * Usage: node scripts/upload-parameters.js <environment>
 * Where environment is: local, staging, or production
 */

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KV_IDS = {
  local: "bfe4ce71ed084aff83f9042381e2daaf",
  staging: "52f365580a3f42b780ddee24c1f5091b",
  production: "bfe4ce71ed084aff83f9042381e2daaf",
};

const environment = process.argv[2];

if (!environment || !["local", "staging", "production"].includes(environment)) {
  console.error("Usage: node scripts/upload-parameters.js <local|staging|production>");
  process.exit(1);
}

const kvId = KV_IDS[environment];
const parametersFile = join(__dirname, "..", "parameters", `${environment}.json`);
const faqsFile = join(__dirname, "..", "parameters", "faqs.json");

try {
  // Read the parameters file
  const parameters = JSON.parse(readFileSync(parametersFile, "utf-8"));

  // Transform to KV bulk format: [{ key: "...", value: "..." }, ...]
  const kvPairs = Object.entries(parameters).map(([key, value]) => ({
    key,
    value: String(value),
  }));

  // FAQ content for the group-chat bot is a JSON document rather than a scalar,
  // so it rides along as a single key. Shared across environments by design —
  // the answers are the same wherever the bot runs.
  const faqs = JSON.parse(readFileSync(faqsFile, "utf-8"));
  kvPairs.push({ key: "FAQS", value: JSON.stringify({ faqs: faqs.faqs }) });

  const todoCount = (faqs.faqs ?? []).filter(faq => faq.answer?.includes("TODO")).length;
  if (todoCount > 0) {
    console.warn(
      `\n⚠️  ${todoCount} of ${faqs.faqs.length} FAQ answers still contain "TODO" placeholders.\n` +
        `   Do not disable FAQ_SHADOW_MODE until these are real.\n`
    );
  }

  // Each worker keeps its own .wrangler/state/v3/kv, and this writes to the
  // repo-root one — so a local upload is invisible to `wrangler dev` inside a
  // worker directory. Say so, rather than letting it look like it worked.
  if (environment === "local") {
    console.warn(
      `\nNote: this writes to the repo-root local KV state, which the workers do not read.\n` +
        `   Worker dev falls back to code defaults (PARAMETER_DEFAULTS) and the bundled\n` +
        `   parameters/faqs.json, so no upload is needed to run them locally.\n`
    );
  }

  // Write temporary file for bulk upload
  const tempFile = join(__dirname, "..", ".kv-upload-temp.json");
  const { writeFileSync, unlinkSync } = await import("fs");
  writeFileSync(tempFile, JSON.stringify(kvPairs, null, 2));

  console.log(`Uploading ${kvPairs.length} parameters to KV (${environment})...`);
  console.log(`KV Namespace ID: ${kvId}`);
  console.log("Parameters:", Object.keys(parameters).join(", "));

  // Upload to KV using wrangler
  // Use --remote for staging/production to upload to Cloudflare, local uses local storage
  const remoteFlag = environment === "local" ? "" : "--remote";
  execSync(`npx wrangler kv bulk put "${tempFile}" --namespace-id=${kvId} ${remoteFlag}`, {
    stdio: "inherit",
  });

  // Clean up temp file
  unlinkSync(tempFile);

  console.log(`\nSuccessfully uploaded parameters to ${environment} KV!`);
} catch (error) {
  console.error("Failed to upload parameters:", error.message);
  process.exit(1);
}
