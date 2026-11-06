// tests/validation-gate-delegation.test.ts
// FEAT-202 / SLICE-112 — lean review gate for /crew:orchestrate-slice.
//
// The actual gate resolver (`deriveValidationGate`, which honors
// `loop.validation.satisfiedByReview` and requires `reviewGate.satisfied &&
// !reviewGate.unproven`) lives in runner-plugin
// (`src/scripts/lib/validation-gate.mts`), not in this repo — dev-team
// consumes it indirectly via the loop plugin's `/runner:close` ceremony.
// There is no import surface for that function inside dev-team (confirmed:
// `grep -rn "deriveValidationGate|satisfiedByReview|review-badge" tests/
// scripts/` turns up nothing pre-slice), so this suite does NOT fabricate a
// cross-plugin import. Instead it asserts at the level dev-team owns:
//
//   1. the committed `.claude/loop.json` config shape that the gate reads
//      (`reviewers.ladder: ["A"]`, `loop.validation.satisfiedByReview: true`)
//   2. the prose contract in `skills/workflow/validator-gate/SKILL.md` and
//      `commands/orchestrate-slice.md` that documents the delegation and the
//      risk-gated exceptions
//
// If runner-plugin ever ships a dev-team-consumable export for
// deriveValidationGate, this suite should be extended to also exercise the
// `satisfied: true` (evidenced review-badge) and `unproven` (no satisfy)
// cases directly against that function.
import fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "bun:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// commands/*.md and skills/** moved from crew/{commands,skills}/ to the
// repo-root {commands,skills}/ in the devcrew command-map merge (SLICE-14).
function resolveRelPath(relPath: string): string {
  return relPath.startsWith("commands/") || relPath.startsWith("skills/")
    ? path.join(repoRoot, "..", relPath)
    : path.join(repoRoot, relPath);
}

async function readJson(relPath: string): Promise<unknown> {
  const text = await fs.readFile(resolveRelPath(relPath), "utf8");
  return JSON.parse(text);
}

async function readText(relPath: string): Promise<string> {
  return fs.readFile(resolveRelPath(relPath), "utf8");
}

// ── AC-1: .claude/loop.json config shape ────────────────────────────────────

test('loop.json: reviewers.ladder is the single-reviewer default ["A"]', async () => {
  const config = (await readJson(".claude/loop.json")) as {
    reviewers?: { ladder?: unknown };
  };
  expect(config.reviewers?.ladder).toEqual(["A"]);
});

test("loop.json: loop.validation.satisfiedByReview is true", async () => {
  const config = (await readJson(".claude/loop.json")) as {
    loop?: { validation?: { satisfiedByReview?: unknown } };
  };
  expect(config.loop?.validation?.satisfiedByReview).toBe(true);
});

test("loop.json: loop.modelRouting is disabled — agent frontmatter governs dispatch models", async () => {
  const config = (await readJson(".claude/loop.json")) as {
    loop?: { modelRouting?: Record<string, unknown> };
  };
  expect(config.loop?.modelRouting).toEqual({ enabled: false });
});

// ── AC-5: validator-gate SKILL documents the satisfiedByReview delegation ──

test("validator-gate SKILL: documents the satisfiedByReview default delegation path", async () => {
  const text = await readText("skills/workflow/validator-gate/SKILL.md");
  expect(text).toMatch(/satisfiedByReview/);
  // FEAT-027 / SLICE-53: the delegation is no longer unconditional — it only
  // applies when `has-consumer-ci` reports a real CI test gate behind it.
  expect(text).toMatch(/has-consumer-ci/);
  expect(text).toMatch(/otherwise dispatch `devcrew:verifier`/);
});

test("validator-gate SKILL: documents the risk-gated exception that still dispatches crew:verifier", async () => {
  const text = await readText("skills/workflow/validator-gate/SKILL.md");
  expect(text).toMatch(/risk: high/i);
  expect(text).toMatch(/concern:security/);
  expect(text).toMatch(/concern:performance/);
  expect(text).toMatch(/SPLIT_BUILD = true/);
});

test("validator-gate SKILL: no longer asserts the old always-dispatch-no-skip absolute", async () => {
  const text = await readText("skills/workflow/validator-gate/SKILL.md");
  expect(text).not.toMatch(/Always dispatch `devcrew:verifier` on any code-bearing slice/i);
  expect(text).not.toMatch(/No skip path: a code-only diff still needs the verifier/i);
});

// ── AC-3/AC-2: commands/orchestrate-slice.md gates the heavy path on risk ──

test("orchestrate-slice.md: RISK_GATE is computed from risk/tags/SPLIT_BUILD before dispatch", async () => {
  const text = await readText("commands/orchestrate-slice.md");
  expect(text).toMatch(/Compute `RISK_GATE`/);
  expect(text).toMatch(/risk: high/i);
  expect(text).toMatch(/concern:security/);
  expect(text).toMatch(/concern:performance/);
  expect(text).toMatch(/SPLIT_BUILD = true/);
});

test("orchestrate-slice.md: RISK_GATE=false dispatches exactly one reviewer, verifier gated on has-consumer-ci", async () => {
  const text = await readText("commands/orchestrate-slice.md");
  expect(text).toMatch(/`RISK_GATE = false`.*dispatch exactly \*\*one\*\* `devcrew:reviewer`/s);
  // FEAT-027 / SLICE-53: the dedicated verifier is skipped only when
  // `has-consumer-ci` reports present; otherwise it still dispatches.
  expect(text).toMatch(/has-consumer-ci/);
  expect(text).toMatch(/`present: false`.*dispatch a dedicated `devcrew:verifier`/s);
});

test("orchestrate-slice.md: RISK_GATE=true still fires the heavy 2nd-reviewer/verifier path", async () => {
  const text = await readText("commands/orchestrate-slice.md");
  expect(text).toMatch(/`RISK_GATE = true`.*dispatch the heavy path/s);
  expect(text).toMatch(/fan-out-review\/SKILL\.md.*AND\/OR a dedicated `devcrew:verifier`/s);
});

test("orchestrate-slice.md: full-suite ownership is documented as CI (ci.yml), not dropped", async () => {
  const text = await readText("commands/orchestrate-slice.md");
  // CI (`.github/workflows/ci.yml`) is the actual full-suite runner — this
  // repo's workflow file is `ci.yml`, not `test.yml` (FEAT-027 / SLICE-53
  // corrected the stale citation; `test.yml` must not reappear here).
  expect(text).toMatch(/\.github\/workflows\/ci\.yml/);
  expect(text).not.toMatch(/\.github\/workflows\/test\.yml/);
  // Honest boundary (reviewer MEDIUM finding): the pre-push hook only checks
  // for a PASS artifact behind a default-off flag — it does NOT run the suite.
  // The prose must not overclaim that pre-push runs the full suite.
  expect(text).toMatch(/pre-push-verifier/);
  expect(text).toMatch(/only checks for a PASS artifact/i);
});
