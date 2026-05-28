import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { deriveValidationGate } from "../scripts/lib/validation-gate.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeValidationsArtifact(repo, filename, body = "# validation\n") {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "validations");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), body);
}

async function writeWorkflowState(repo, currentRun) {
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
