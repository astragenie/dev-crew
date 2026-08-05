// SLICE-200 / FEAT-283 defect 1 — review-gate.mts must distinguish an
// unrecognized verdict (e.g. "PASS") from a recognized rejection. Before
// this fix both fell through to the same "a rejected review cannot close"
// message/remedy, which is wrong: unrecognized means fix the artifact,
// rejected means fix the code.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  deriveReviewGate,
  REVIEW_SATISFIED,
  REVIEW_REJECTED
} from "../scripts/lib/review-gate.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeReviewArtifact(
  repo: string,
  sliceId: string,
  decision: string
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/crew/reviews");
  await fs.mkdir(dir, { recursive: true });
  const token = sliceId.toLowerCase();
  const file = path.join(dir, `20260805T120000Z-review-result-${token}-test.md`);
  await fs.writeFile(file, `---\ndecision: ${decision}\n---\n# review for ${sliceId}\n`);
  return file;
}

test("deriveReviewGate: unrecognized verdict (PASS) is NOT satisfied and NOT reported as rejected", async () => {
  const repo = await tmpRepo("rg-unrec-");
  await writeReviewArtifact(repo, "SLICE-200", "PASS");
  const gate = await deriveReviewGate(repo, "SLICE-200");
  assert.equal(gate.satisfied, false, "unrecognized verdict must not satisfy the gate");
  assert.equal(gate.unrecognized, true);
  assert.doesNotMatch(
    gate.reason,
    /a rejected review cannot close/,
    "unrecognized-verdict message must not reuse the rejected-review remedy"
  );
  assert.match(gate.reason, /unrecognized verdict/);
  assert.match(gate.reason, /PASS/, "message must name the offending value");
  assert.match(gate.reason, /approved/, "message must list the accepted vocabulary");
});

test("deriveReviewGate: unrecognized vs rejected produce DIFFERENT reason strings", async () => {
  const unrecognizedRepo = await tmpRepo("rg-cmp-unrec-");
  await writeReviewArtifact(unrecognizedRepo, "SLICE-200", "PASS");
  const unrecognizedGate = await deriveReviewGate(unrecognizedRepo, "SLICE-200");

  const rejectedRepo = await tmpRepo("rg-cmp-rej-");
  await writeReviewArtifact(rejectedRepo, "SLICE-200", "rejected");
  const rejectedGate = await deriveReviewGate(rejectedRepo, "SLICE-200");

  assert.equal(unrecognizedGate.satisfied, false);
  assert.equal(rejectedGate.satisfied, false);
  assert.notEqual(
    unrecognizedGate.reason,
    rejectedGate.reason,
    "a satisfied===false check alone must not be enough to pass this test"
  );
  assert.match(rejectedGate.reason, /a rejected review cannot close/);
  assert.doesNotMatch(unrecognizedGate.reason, /a rejected review cannot close/);
  assert.notEqual(Boolean(unrecognizedGate.unrecognized), Boolean(rejectedGate.unrecognized));
});

test("deriveReviewGate: rejected verdict still reports satisfied:false with the rejected remedy", async () => {
  const repo = await tmpRepo("rg-rejected-");
  await writeReviewArtifact(repo, "SLICE-200", "rejected");
  const gate = await deriveReviewGate(repo, "SLICE-200");
  assert.equal(gate.satisfied, false);
  assert.equal(gate.unrecognized ?? false, false);
  assert.match(gate.reason, /a rejected review cannot close/);
});

test("deriveReviewGate: each accepted verdict spelling (any case) satisfies the gate", async () => {
  const spellings = ["approved", "Approved", "APPROVED_WITH_NOTES", "approved_with_notes"];
  for (const decision of spellings) {
    const repo = await tmpRepo("rg-accept-");
    await writeReviewArtifact(repo, "SLICE-200", decision);
    const gate = await deriveReviewGate(repo, "SLICE-200");
    assert.equal(gate.satisfied, true, `expected "${decision}" to satisfy the gate`);
    assert.equal(gate.unrecognized ?? false, false);
  }
});

test("deriveReviewGate: a case-variant rejection (e.g. Rejected) is treated as the accepted rejected value", async () => {
  const repo = await tmpRepo("rg-reject-case-");
  await writeReviewArtifact(repo, "SLICE-200", "Rejected");
  const gate = await deriveReviewGate(repo, "SLICE-200");
  assert.equal(gate.satisfied, false);
  assert.equal(
    gate.unrecognized ?? false,
    false,
    "case-variant rejection must not be unrecognized"
  );
  assert.match(gate.reason, /a rejected review cannot close/);
});

test("REVIEW_SATISFIED and REVIEW_REJECTED are exported and disjoint (vocabulary reconciliation, AC-2)", () => {
  assert.ok(REVIEW_SATISFIED.has("approved"));
  assert.ok(REVIEW_SATISFIED.has("approved_with_notes"));
  assert.ok(REVIEW_REJECTED.has("rejected"));
  for (const v of REVIEW_SATISFIED) {
    assert.equal(REVIEW_REJECTED.has(v), false, "accepted and rejected vocab must not overlap");
  }
  // "pass" is deliberately excluded from the review-decision vocabulary even
  // though failure-classifier.mts::PASS_VERDICTS treats it as valid for a
  // different field (grade `verdict`, not review `decision`) — see the
  // reconciliation comment in review-gate.mts.
  assert.equal(REVIEW_SATISFIED.has("pass"), false);
});
