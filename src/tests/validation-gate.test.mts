import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { deriveValidationGate } from "../scripts/lib/validation-gate.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeValidationsArtifact(repo: string, filename: string, body = "# validation\n") {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "validations");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), body);
}

async function writeWorkflowState(repo: string, currentRun: Record<string, any>) {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ version: "1.0", currentRun }, null, 2)
  );
}

test("deriveValidationGate unsatisfied when no artifact, badge, or waiver", async () => {
  const repo = await tmpRepo("al-vgate-empty-");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
  assert.deepEqual(result.evidence, []);
});

test("deriveValidationGate satisfied when requires_validation: false in slice frontmatter", async () => {
  const repo = await tmpRepo("al-vgate-waiver-");
  const result = await deriveValidationGate(repo, "SLICE-01", {
    sliceFm: { requires_validation: false }
  });
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /explicit-waiver/);
});

test("deriveValidationGate satisfied when validation_passed badge present", async () => {
  const repo = await tmpRepo("al-vgate-passed-");
  await writeWorkflowState(repo, {
    gates: { validation: { status: "passed", note: "all-green" } }
  });
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation_passed/);
});

test("deriveValidationGate satisfied when validation_skipped badge present, surfaces note", async () => {
  const repo = await tmpRepo("al-vgate-skipped-");
  await writeWorkflowState(repo, {
    gates: { validation: { status: "skipped", note: "doc-only" } }
  });
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation_skipped: doc-only/);
});

test("deriveValidationGate satisfied when matching validation artifact present", async () => {
  const repo = await tmpRepo("al-vgate-artifact-");
  await writeValidationsArtifact(repo, "20260528T120000Z-validation-result-slice01-feature.md");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation artifact present \(1\)/);
  assert.equal(result.evidence.length, 1);
});

test("deriveValidationGate matches artifact via SLICE-1 unpadded id", async () => {
  const repo = await tmpRepo("al-vgate-unpadded-");
  await writeValidationsArtifact(repo, "validation-SLICE-1.md");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.equal(result.evidence.length, 1);
});

test("deriveValidationGate ignores artifacts for other slices", async () => {
  const repo = await tmpRepo("al-vgate-otherslice-");
  await writeValidationsArtifact(repo, "validation-result-slice99.md");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
});

test("deriveValidationGate: waiver wins over missing artifact", async () => {
  const repo = await tmpRepo("al-vgate-waiver-wins-");
  const result = await deriveValidationGate(repo, "SLICE-01", {
    sliceFm: { requires_validation: false }
  });
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /explicit-waiver/);
});

// satisfiedByReview (loop.validation.satisfiedByReview): the reviewer's
// approval badge satisfies the validation gate, delegating behavior/test
// validation to CI. Opt-in — off by default so independent validation stands.
async function writeReviewArtifact(repo: string, sliceId: string, decision: string) {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "reviews");
  await fs.mkdir(dir, { recursive: true });
  const token = sliceId.toLowerCase();
  const body = `---\ndecision: ${decision}\n---\n# review for ${sliceId}\n`;
  await fs.writeFile(path.join(dir, `20260705T120000Z-review-result-${token}-test.md`), body);
}

const REVIEW_BADGE_CONFIG = { loop: { validation: { satisfiedByReview: true } } };

test("satisfiedByReview: approved review satisfies validation gate", async () => {
  const repo = await tmpRepo("al-vgate-review-ok-");
  await writeReviewArtifact(repo, "SLICE-01", "approved");
  const result = await deriveValidationGate(repo, "SLICE-01", { config: REVIEW_BADGE_CONFIG });
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /review-badge/);
});

test("satisfiedByReview: rejected review does NOT satisfy (review gate unsatisfied)", async () => {
  const repo = await tmpRepo("al-vgate-review-rejected-");
  await writeReviewArtifact(repo, "SLICE-01", "rejected");
  const result = await deriveValidationGate(repo, "SLICE-01", { config: REVIEW_BADGE_CONFIG });
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
});

test("satisfiedByReview OFF: an approved review does not satisfy validation", async () => {
  const repo = await tmpRepo("al-vgate-review-flagoff-");
  await writeReviewArtifact(repo, "SLICE-01", "approved");
  const result = await deriveValidationGate(repo, "SLICE-01"); // no config → flag off
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
});
