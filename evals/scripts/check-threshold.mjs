#!/usr/bin/env node
/**
 * Reads a promptfoo JSON result file and fails the build when the pass rate
 * drops below a threshold.
 *
 * Usage:  node scripts/check-threshold.mjs results.json 0.85
 *
 * Why this exists: `promptfoo eval` exits non-zero as soon as a single
 * assertion fails. For a nightly quality gate we want a tolerance band — one
 * flaky case should not turn the pipeline red, a real regression should.
 */

import fs from "node:fs";

const file = process.argv[2] ?? "results.json";
const threshold = Number(process.argv[3] ?? 0.85);

if (!fs.existsSync(file)) {
  console.error(`[evals] Result file not found: ${file}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, "utf8"));

// promptfoo has changed its JSON shape between versions, so look in both places.
let successes;
let failures;

const stats = data?.results?.stats ?? data?.stats ?? null;

if (stats && typeof stats.successes === "number") {
  successes = stats.successes;
  failures = stats.failures ?? 0;
} else {
  const rows = Array.isArray(data?.results?.results)
    ? data.results.results
    : Array.isArray(data?.results)
      ? data.results
      : [];
  if (rows.length === 0) {
    console.error("[evals] Could not read any results from the file.");
    process.exit(1);
  }
  successes = rows.filter((r) => r.success).length;
  failures = rows.length - successes;
}

const total = successes + failures;
const rate = total === 0 ? 0 : successes / total;

console.log("");
console.log("──────────────────────────────────────────");
console.log(`  Passed:    ${successes}/${total}`);
console.log(`  Pass rate: ${(rate * 100).toFixed(1)}%`);
console.log(`  Threshold: ${(threshold * 100).toFixed(1)}%`);
console.log("──────────────────────────────────────────");
console.log("");

if (rate < threshold) {
  console.error(
    `[evals] FAIL — pass rate ${(rate * 100).toFixed(1)}% is below the ${(threshold * 100).toFixed(1)}% threshold.`,
  );
  process.exit(1);
}

console.log("[evals] PASS — quality gate met.");
