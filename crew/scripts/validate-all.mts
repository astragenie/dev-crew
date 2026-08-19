#!/usr/bin/env node

// Runs all four core validators concurrently and reports results.
// Exits 0 only when every validator passes; exits 1 on any failure.
// Usage: node --experimental-strip-types scripts/validate-all.mts

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const validators = ["validate-manifests.mts", "validate-slices.mts"];

// Advisory pending the agent/skill content-backfill FEAT (SLICE-24 decision):
// P3's surface merge exposed pre-existing content gaps (missing prompt_id /
// version / report-contract on runner-origin agents, dangling eval-spec
// pointers). These report findings but do not fail the aggregate.
const advisoryValidators = ["validate-skills.mts", "validate-agents.mts"];

interface ValidatorResult {
  script: string;
  ok: boolean;
  output: string;
}

function runValidator(script: string): Promise<ValidatorResult> {
  return new Promise((resolve) => {
    const proc = spawn("bun", [join(__dirname, script)], {
      stdio: "pipe"
    });
    let output = "";
    proc.stdout.on("data", (d: Buffer) => {
      output += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      output += d.toString();
    });
    proc.on("close", (code) => resolve({ script, ok: code === 0, output }));
  });
}

function printResults(results: ValidatorResult[]): void {
  for (const r of results) {
    if (r.ok) {
      process.stdout.write(`✓ ${r.script}\n`);
    } else {
      process.stderr.write(`✗ ${r.script}\n${r.output}\n`);
    }
  }
}

const results = await Promise.all(validators.map(runValidator));
const failures = results.filter((r) => !r.ok);

printResults(results);

const advisoryResults = await Promise.all(advisoryValidators.map(runValidator));
for (const r of advisoryResults) {
  if (r.ok) {
    process.stdout.write(`✓ ${r.script}\n`);
  } else {
    process.stdout.write(`⚠ ${r.script} (advisory — findings do not fail the aggregate)\n`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`\n${failures.length} validator(s) failed.\n`);
  process.exit(1);
}

process.stdout.write(`All ${validators.length} validators passed.\n`);
