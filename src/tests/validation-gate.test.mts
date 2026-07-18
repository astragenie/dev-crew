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

// BLOCKER regression (PR #304 review): with satisfiedByReview on, a slice with
// NO review artifact at all must NOT satisfy validation. deriveReviewGate returns
// `satisfied: true, unproven: true` on absence (tolerant fallthrough); that
// tolerance must not leak across to the validation gate, or a slice could close
// with no review AND no validation.
test("satisfiedByReview: NO review artifact (unproven) does NOT satisfy validation", async () => {
  const repo = await tmpRepo("al-vgate-review-absent-");
  // No review artifact, no validation artifact, no badge, no waiver.
  const result = await deriveValidationGate(repo, "SLICE-01", { config: REVIEW_BADGE_CONFIG });
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
});

// Guard the tolerance directly: a legacy review artifact with no decision
// frontmatter grandfathers as satisfied-but-unproven for the REVIEW gate, yet
// must still not delegate the VALIDATION gate under satisfiedByReview.
test("satisfiedByReview: legacy no-decision review (unproven-ish) still requires real evidence", async () => {
  const repo = await tmpRepo("al-vgate-review-legacy-");
  await writeReviewArtifact(repo, "SLICE-01", "approved");
  // A real approved artifact IS proven → should satisfy (positive control for the
  // fix so we don't over-correct into rejecting genuine approvals).
  const ok = await deriveValidationGate(repo, "SLICE-01", { config: REVIEW_BADGE_CONFIG });
  assert.equal(ok.satisfied, true);
  assert.match(ok.reason, /review-badge/);
});

// Decision-vocabulary synonyms (operator papercut: a validator wrote
// `decision: passed` and the gate reported a confusing "a failed validation
// cannot close" message for what was actually a pass).
async function writeValidationArtifactWithDecision(
  repo: string,
  sliceId: string,
  decision: string,
  extraFrontmatter = ""
) {
  const token = sliceId.toLowerCase();
  const body = `---\ndecision: ${decision}\n${extraFrontmatter}---\n# validation for ${sliceId}\n`;
  await writeValidationsArtifact(repo, `20260709T120000Z-validation-result-${token}-test.md`, body);
}

for (const [synonym, expectedSatisfied, expectedReasonPattern] of [
  ["pass", true, /validation artifact decision: pass \(/],
  ["passed", true, /validation artifact decision: pass \[normalized from 'passed'\]/],
  ["approved", true, /validation artifact decision: pass \[normalized from 'approved'\]/],
  ["fail", false, /validation artifact decision: fail \(/],
  ["failed", false, /validation artifact decision: fail \[normalized from 'failed'\]/],
  ["skipped", true, /validation artifact decision: skipped \(/],
  ["skip", true, /validation artifact decision: skipped \[normalized from 'skip'\]/]
] as const) {
  test(`deriveValidationGate normalizes decision synonym '${synonym}'`, async () => {
    const repo = await tmpRepo(`al-vgate-synonym-${synonym}-`);
    await writeValidationArtifactWithDecision(repo, "SLICE-01", synonym);
    const result = await deriveValidationGate(repo, "SLICE-01");
    assert.equal(result.satisfied, expectedSatisfied);
    assert.match(result.reason, expectedReasonPattern);
  });
}

test("deriveValidationGate: unrecognized decision reports 'unrecognized decision' shape, not a failure implication", async () => {
  const repo = await tmpRepo("al-vgate-unrecognized-");
  await writeValidationArtifactWithDecision(repo, "SLICE-01", "wontfix");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /^unrecognized decision 'wontfix' — expected pass\|fail\|skipped/);
  assert.doesNotMatch(result.reason, /a failed validation cannot close/);
});

// Combined-slice filename tokens: one artifact can validate multiple slices,
// e.g. "...validation-result-slice-157-158-....md". Both SLICE-157 and
// SLICE-158 must match it; a boundary-unaware substring check only matched
// the first number in the run.
test("deriveValidationGate: combined-slice artifact filename matches both slice ids", async () => {
  const repo = await tmpRepo("al-vgate-combined-");
  await writeValidationsArtifact(
    repo,
    "20260709T120000Z-validation-result-slice-157-158-deploy.md"
  );
  const result157 = await deriveValidationGate(repo, "SLICE-157");
  const result158 = await deriveValidationGate(repo, "SLICE-158");
  assert.equal(result157.satisfied, true);
  assert.equal(result157.evidence.length, 1);
  assert.equal(result158.satisfied, true);
  assert.equal(result158.evidence.length, 1);
});

// Boundary guard: SLICE-15 must NOT match a slice-158 artifact even though
// "slice-15" is a string-prefix of "slice-158" — a naive `includes()` check
// would falsely match.
test("deriveValidationGate: SLICE-15 does NOT match a slice-158 artifact", async () => {
  const repo = await tmpRepo("al-vgate-noboundary-");
  await writeValidationsArtifact(repo, "20260709T120000Z-validation-result-slice-158-deploy.md");
  const result = await deriveValidationGate(repo, "SLICE-15");
  assert.equal(result.satisfied, false);
});

// Same boundary guard against the combined-slice artifact itself: SLICE-15
// must not match "slice-157-158" just because "157" starts with "15" as a
// substring at the wrong split point.
test("deriveValidationGate: SLICE-15 does NOT match the combined slice-157-158 artifact", async () => {
  const repo = await tmpRepo("al-vgate-noboundary-combined-");
  await writeValidationsArtifact(
    repo,
    "20260709T120000Z-validation-result-slice-157-158-deploy.md"
  );
  const result = await deriveValidationGate(repo, "SLICE-15");
  assert.equal(result.satisfied, false);
});

// FEAT-264 SLICE-3 (AC-3, architect C.2): a `kind: test-plan` artifact is a
// pre-build QA-gate plan (qa-gate-preflight.mts), not close-time validation
// evidence — it must land in the same scan directory as real validation
// artifacts (.claude/artifacts/crew/validations/) yet neither satisfy nor
// fail the close-time gate on its own.
test("deriveValidationGate: a lone kind:test-plan artifact does NOT satisfy the gate", async () => {
  const repo = await tmpRepo("al-vgate-testplan-alone-");
  await writeValidationsArtifact(
    repo,
    "20260718T000000Z-test-plan-slice-01.md",
    "---\nkind: test-plan\nslice: SLICE-01\n---\n# test plan\n"
  );
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
  assert.deepEqual(result.evidence, []);
});

// A test-plan artifact must not "fail" the gate either — even one carrying a
// stray decision-shaped key, since kind:test-plan takes precedence over
// whatever else the file happens to contain.
test("deriveValidationGate: a kind:test-plan artifact with a decision key still does not drive the gate", async () => {
  const repo = await tmpRepo("al-vgate-testplan-decision-");
  await writeValidationsArtifact(
    repo,
    "20260718T000000Z-test-plan-slice-01.md",
    "---\nkind: test-plan\ndecision: fail\n---\n# test plan\n"
  );
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, false);
  assert.match(result.reason, /no validation artifact/);
});

// A real validation artifact alongside an unrelated test-plan artifact must
// still satisfy normally — the exclusion only removes test-plan files from
// consideration, it doesn't disturb the rest of the scan.
test("deriveValidationGate: a real validation artifact still satisfies alongside a co-located test-plan artifact", async () => {
  const repo = await tmpRepo("al-vgate-testplan-coexist-");
  await writeValidationsArtifact(
    repo,
    "20260718T000000Z-test-plan-slice-01.md",
    "---\nkind: test-plan\n---\n# test plan\n"
  );
  await writeValidationArtifactWithDecision(repo, "SLICE-01", "pass");
  const result = await deriveValidationGate(repo, "SLICE-01");
  assert.equal(result.satisfied, true);
  assert.match(result.reason, /validation artifact decision: pass/);
  assert.equal(result.evidence.length, 1);
});
