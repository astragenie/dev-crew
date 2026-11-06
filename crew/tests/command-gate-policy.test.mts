import { test, expect } from "bun:test";
// tests/command-gate-policy.test.mts — FEAT-027 / SLICE-53 (audit T5): the
// five docs that describe the reviewer/verifier dispatch decision must all
// carry the SAME policy sentence (no drifted paraphrase), must not carry any
// of the three forbidden phrases that contradicted the real, config-driven
// skip decision in src/scripts/lib/validation-gate.mts, and must not cite
// `.github/workflows/test.yml` (this repo's CI workflow is `ci.yml`).
import fs from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..");

const FIVE_DOCS = [
  "commands/orchestrate-slice.md",
  "commands/fix.md",
  "crew/docs/routing-table.md",
  "skills/workflow/dispatcher-routing/SKILL.md",
  "skills/workflow/validator-gate/SKILL.md"
];

const POLICY_SENTENCE =
  'LOW-risk slices: one reviewer; verifier is replaced by `write-validation-result --decision skipped --skip-reason "delegated to CI: <workflow file>"` only when `has-consumer-ci` reports present; otherwise dispatch `devcrew:verifier`.';

const FORBIDDEN_PHRASES = [
  "No skip path",
  "No verifier dispatch",
  "`devcrew:reviewer` + `devcrew:verifier` concurrently"
];

async function readDoc(relPath: string): Promise<string> {
  return fs.readFile(path.join(REPO_ROOT, relPath), "utf8");
}

test("command-gate-policy: each of the five docs carries the exact policy sentence", async () => {
  for (const doc of FIVE_DOCS) {
    const content = await readDoc(doc);
    expect(content.includes(POLICY_SENTENCE)).toBe(true);
  }
});

test("command-gate-policy: none of the five docs carries a forbidden phrase", async () => {
  for (const doc of FIVE_DOCS) {
    const content = await readDoc(doc);
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(content.includes(phrase)).toBe(false);
    }
  }
});

test("command-gate-policy: none of the five docs cites .github/workflows/test.yml", async () => {
  for (const doc of FIVE_DOCS) {
    const content = await readDoc(doc);
    expect(content.includes("test.yml")).toBe(false);
  }
});

test("command-gate-policy: orchestrate-slice.md and fix.md both call has-consumer-ci", async () => {
  for (const doc of ["commands/orchestrate-slice.md", "commands/fix.md"]) {
    const content = await readDoc(doc);
    expect(content.includes("has-consumer-ci --repo")).toBe(true);
  }
});
