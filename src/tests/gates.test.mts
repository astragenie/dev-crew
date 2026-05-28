// @ts-nocheck
// Gate function tests: positive and negative coverage for
// deriveValidationGate, deriveTestAdequacyGate, runSliceStartGates,
// and computeFeatureResult.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { deriveValidationGate } from "../scripts/lib/validation-gate.mjs";
import { deriveTestAdequacyGate } from "../scripts/lib/test-adequacy-gate.mjs";
import { startSlice, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { recordGradeScore } from "../scripts/lib/grade-trend.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function writeWorkflowState(repo: string, currentRun: unknown): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun }, null, 2)
  );
}

async function writeValidationArtifact(repo: string, filename: string): Promise<void> {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "validations");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), "# Validation\n\n**Status:** PASS\n");
}

async function writeReviewArtifact(
  repo: string,
  relPath: string,
  opts: { testAdequacy?: string; skipReason?: string } = {}
): Promise<void> {
  const absPath = path.join(repo, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const lines = [
    "# Review",
    "",
    "## Fields",
    "",
    "- Decision: PASS",
    `- Test Adequacy: ${opts.testAdequacy ?? "-"}`
  ];
  if (opts.skipReason) lines.push(`- Test Adequacy Skip Reason: ${opts.skipReason}`);
  await fs.writeFile(absPath, lines.join("\n"));
}

async function writeSliceWithReviews(repo: string, reviews: string[]): Promise<void> {
  const sliceDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(sliceDir, { recursive: true });
  const slicePath = path.join(sliceDir, "SLICE_01_test.md");
  const reviewLines =
    reviews.length > 0 ? `reviews:\n${reviews.map((r) => `  - ${r}`).join("\n")}\n` : "";
  await fs.writeFile(
    slicePath,
    `---\nid: SLICE-01\nstatus: pending\n${reviewLines}---\n# SLICE-01: test\n`
  );
}

async function fillPlaceholderACs(slicePath: string): Promise<void> {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

// ---------------------------------------------------------------------------
// deriveValidationGate — gate BLOCKS (satisfied: false)
// ---------------------------------------------------------------------------

test("gates: deriveValidationGate blocks when no artifact, badge, or waiver present", async () => {
  const repo = await tmpRepo("gt-vgate-block-");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
  assert.deepEqual(result.evidence, []);
});

test("gates: deriveValidationGate blocks when workflow state has no validation key", async () => {
  const repo = await tmpRepo("gt-vgate-nokey-");
  await writeWorkflowState(repo, { gates: {} });
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
});

test("gates: deriveValidationGate blocks when validation artifact is for a different slice", async () => {
  const repo = await tmpRepo("gt-vgate-wrongslice-");
  await writeValidationArtifact(repo, "validation-result-slice99-feature.md");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.deepEqual(result.evidence, []);
});

// ---------------------------------------------------------------------------
// deriveValidationGate — gate PASSES (satisfied: true)
// ---------------------------------------------------------------------------

test("gates: deriveValidationGate passes with requires_validation: false waiver", async () => {
  const repo = await tmpRepo("gt-vgate-waiver-");
  const result = await deriveValidationGate(repo, "SLICE-01", {
    sliceFm: { requires_validation: false }
  });
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /explicit-waiver/);
});

test("gates: deriveValidationGate passes when validation_passed badge in workflow state", async () => {
  const repo = await tmpRepo("gt-vgate-pass-badge-");
  await writeWorkflowState(repo, {
    gates: { validation: { status: "passed", note: "all-green" } }
  });
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation_passed/);
});

test("gates: deriveValidationGate passes when validation_skipped badge in workflow state", async () => {
  const repo = await tmpRepo("gt-vgate-skipped-badge-");
  await writeWorkflowState(repo, {
    gates: { validation: { status: "skipped", note: "doc-only" } }
  });
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation_skipped/);
  assert.match(result.reason, /doc-only/);
});

test("gates: deriveValidationGate passes when matching artifact exists under validations/", async () => {
  const repo = await tmpRepo("gt-vgate-artifact-");
  await writeValidationArtifact(repo, "20260528T120000Z-validation-result-slice01-feature.md");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.equal(result.evidence.length, 1);
  assert.match(result.reason, /validation artifact present \(1\)/);
});

// ---------------------------------------------------------------------------
// deriveTestAdequacyGate — gate BLOCKS (satisfied: false)
// ---------------------------------------------------------------------------

test("gates: deriveTestAdequacyGate blocks when review has empty placeholder '-' test adequacy", async () => {
  const repo = await tmpRepo("gt-tag-block-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, { testAdequacy: "-" });
  await writeSliceWithReviews(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.ok(Array.isArray(result.emptyArtifacts));
  assert.equal(result.emptyArtifacts.length, 1);
  assert.match(result.reason, /test-adequacy-gate/);
});

test("gates: deriveTestAdequacyGate blocks when one of two reviews lacks test adequacy", async () => {
  const repo = await tmpRepo("gt-tag-partial-");
  const rel1 = ".claude/artifacts/crew/reviews/review-001.md";
  const rel2 = ".claude/artifacts/crew/reviews/review-002.md";
  await writeReviewArtifact(repo, rel1, { testAdequacy: "unit + integration tests added" });
  await writeReviewArtifact(repo, rel2, { testAdequacy: "-" });
  await writeSliceWithReviews(repo, [rel1, rel2]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.equal(result.emptyArtifacts.length, 1);
  assert.ok(result.emptyArtifacts[0].includes("review-002"));
});

// ---------------------------------------------------------------------------
// deriveTestAdequacyGate — gate PASSES (satisfied: true)
// ---------------------------------------------------------------------------

test("gates: deriveTestAdequacyGate passes when no reviews are linked to slice", async () => {
  const repo = await tmpRepo("gt-tag-noreviews-");
  await writeSliceWithReviews(repo, []);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /no review artifacts/);
});

test("gates: deriveTestAdequacyGate passes when all linked reviews have test adequacy populated", async () => {
  const repo = await tmpRepo("gt-tag-pass-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, { testAdequacy: "All edge cases covered" });
  await writeSliceWithReviews(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /test adequacy populated/);
});

test("gates: deriveTestAdequacyGate passes when test adequacy has skip reason", async () => {
  const repo = await tmpRepo("gt-tag-skipreason-");
  const rel = ".claude/artifacts/crew/reviews/review-001.md";
  await writeReviewArtifact(repo, rel, {
    testAdequacy: "-",
    skipReason: "doc-only slice, no behavior changed"
  });
  await writeSliceWithReviews(repo, [rel]);
  const result = await deriveTestAdequacyGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
});

// ---------------------------------------------------------------------------
// runSliceStartGates (exercised via startSlice) — gate BLOCKS
// ---------------------------------------------------------------------------

test("gates: runSliceStartGates blocks when slice has placeholder ACs", async () => {
  const repo = await tmpRepo("gt-start-acblock-");
  const feat = await addFeature(repo, { title: "AC placeholder test" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Do NOT fill placeholder ACs — linter should reject
  await assert.rejects(
    () => startSlice(repo, slice.id),
    (err) => {
      assert.match(err.message, /AC linter failed/);
      assert.match(err.message, /placeholder/i);
      return true;
    }
  );
});

test("gates: runSliceStartGates blocks when grade trend is below threshold", async () => {
  const repo = await tmpRepo("gt-start-ladderblock-");
  const feat = await addFeature(repo, { title: "Grade trend gate" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  // Record 2 consecutive below-threshold scores
  await recordGradeScore(repo, { sliceId: "SLICE-00", avg: 0.4 });
  await recordGradeScore(repo, { sliceId: "SLICE-00b", avg: 0.45 });

  const config = { loop: { gradeTrendConsecutiveLimit: 2, gradeTrendThreshold: 0.65 } };
  await assert.rejects(
    () => startSlice(repo, slice.id, { config }),
    (err) => {
      assert.match(err.message, /Ladder gate/);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// runSliceStartGates (exercised via startSlice) — gate PASSES
// ---------------------------------------------------------------------------

test("gates: runSliceStartGates passes with concrete ACs and clean grade trend", async () => {
  const repo = await tmpRepo("gt-start-pass-");
  const feat = await addFeature(repo, { title: "Clean gate test" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.slice.id, slice.id);
});

// ---------------------------------------------------------------------------
// computeFeatureResult (exercised via completeSlice) — gate BLOCKS
// ---------------------------------------------------------------------------

test("gates: computeFeatureResult skips feature when crew run is escalated_to_human", async () => {
  const repo = await tmpRepo("gt-cfr-escalated-");
  const feat = await addFeature(repo, { title: "Escalated run" });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Write escalated workflow state
  await writeWorkflowState(repo, {
    gates: {
      escalation: { status: "escalated", note: "Blocked by external dependency" }
    }
  });
  // Write validation artifact so only escalation blocks
  const dir = path.join(repo, ".claude/artifacts/crew/validations");
  await fs.mkdir(dir, { recursive: true });
  const normalizedId = slice.id.toLowerCase().replace("-", "");
  await fs.writeFile(
    path.join(dir, `20260528T120000Z-validation-result-${normalizedId}-feature.md`),
    "# Validation\n\n**Status:** PASS\n"
  );

  const result = await completeSlice(repo, slice.id);
  assert.equal(result.feature.skipped, true);
  assert.match(result.feature.reason, /escalated_to_human/);
});

// ---------------------------------------------------------------------------
// computeFeatureResult (exercised via completeSlice) — gate PASSES
// ---------------------------------------------------------------------------

test("gates: computeFeatureResult moves feature to done when all gates pass", async () => {
  const repo = await tmpRepo("gt-cfr-pass-");
  const feat = await addFeature(repo, { title: "All gates pass" });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Write validation artifact
  const dir = path.join(repo, ".claude/artifacts/crew/validations");
  await fs.mkdir(dir, { recursive: true });
  const normalizedId = slice.id.toLowerCase().replace("-", "");
  await fs.writeFile(
    path.join(dir, `20260528T120000Z-validation-result-${normalizedId}-feature.md`),
    "# Validation\n\n**Status:** PASS\n"
  );

  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-/);
  assert.equal(result.validationGate.satisfied, true);
});
