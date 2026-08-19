// FEAT-275 / SLICE-178 — close-dispatch-telemetry.mts

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  classifyGateForTelemetry,
  recordGateDispatchTelemetry,
  recordCloseDispatchTelemetry
} from "../scripts/lib/slice-linker/close-dispatch-telemetry.mjs";
import { pauseEventsPath } from "../scripts/lib/pause-telemetry.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readPauseLines(repo: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await fs.readFile(pauseEventsPath(repo), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// classifyGateForTelemetry — pure classification rules
// ---------------------------------------------------------------------------

test("classifyGateForTelemetry does not record an explicit waiver", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    reason: "explicit-waiver: slice frontmatter requires_review: false"
  });
  assert.equal(decision.record, false);
});

test("classifyGateForTelemetry does not record an unproven (absence-tolerated) gate", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    unproven: true,
    reason: "no review artifact matched ... tolerated"
  });
  assert.equal(decision.record, false);
});

test("classifyGateForTelemetry does not record a review-delegated validation gate", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    reason: "review-badge: validation delegated to evidenced reviewer approval + CI test gate (...)"
  });
  assert.equal(decision.record, false);
});

// FEAT-275 review finding #1: a skip-badge resolution must NEVER be recorded
// as a "resume_success" pause_event -- that would be unpaired (no matching
// "pause" was ever witnessed by this retroactive gate read), which inflates
// summarizePauseRate's resumeSuccessRate without bound. Recorded as a
// "paused" dispatch_outcome only, with no pause_event at all.
test("classifyGateForTelemetry records a skipped-badge gate (pause-indicating note) as paused, no pause_event", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    reason: "workflow-state gate: review_skipped: lead-attested, no artifact"
  });
  assert.equal(decision.record, true);
  assert.equal(decision.outcome, "paused");
  assert.equal(decision.emitPauseEvent, false);
});

// FEAT-275 review finding #3: `*_skipped` is a general escape valve also
// used for policy-based (non-pause) skips -- a note that doesn't actually
// cite a pause must not be recorded as dispatch evidence at all.
test("classifyGateForTelemetry does not record a skipped-badge gate whose note is a policy skip, not a pause", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    reason: "workflow-state gate: validation_skipped: doc-only slice, no behavior changed"
  });
  assert.equal(decision.record, false);
});

test("classifyGateForTelemetry records a real verdict/pass as completed", () => {
  const decision = classifyGateForTelemetry({
    satisfied: true,
    reason: "review artifact decision: approved (SLICE-178-review.md)"
  });
  assert.equal(decision.record, true);
  assert.equal(decision.outcome, "completed");
  assert.equal(decision.emitPauseEvent, false);
});

test("classifyGateForTelemetry records an unsatisfied gate as paused + emits a pause_event", () => {
  const decision = classifyGateForTelemetry({
    satisfied: false,
    reason: "no validation artifact under .claude/artifacts/crew/validations/, ..."
  });
  assert.equal(decision.record, true);
  assert.equal(decision.outcome, "paused");
  assert.equal(decision.emitPauseEvent, true);
});

// ---------------------------------------------------------------------------
// recordGateDispatchTelemetry — I/O wiring
// ---------------------------------------------------------------------------

test("recordGateDispatchTelemetry writes nothing for a non-recordable gate", async () => {
  const repo = await tmpRepo("cdt-norecord-");
  await recordGateDispatchTelemetry(repo, "SLICE-1", "devcrew:reviewer", {
    satisfied: true,
    unproven: true,
    reason: "no review artifact matched"
  });
  const lines = await readPauseLines(repo);
  assert.equal(lines.length, 0);
});

test("recordGateDispatchTelemetry records completed for a clean approval", async () => {
  const repo = await tmpRepo("cdt-completed-");
  await recordGateDispatchTelemetry(repo, "SLICE-1", "devcrew:reviewer", {
    satisfied: true,
    reason: "review artifact decision: approved (x.md)"
  });
  const lines = await readPauseLines(repo);
  assert.equal(lines.length, 1);
  assert.equal(lines[0]!.type, "dispatch_outcome");
  assert.equal(lines[0]!.outcome, "completed");
  assert.equal(lines[0]!.agentRole, "devcrew:reviewer");
  assert.equal(lines[0]!.sliceId, "SLICE-1");
});

test("recordGateDispatchTelemetry records paused + pause_event for an unsatisfied gate", async () => {
  const repo = await tmpRepo("cdt-paused-");
  await recordGateDispatchTelemetry(repo, "SLICE-2", "devcrew:verifier", {
    satisfied: false,
    reason: "no validation artifact under ..."
  });
  const lines = await readPauseLines(repo);
  assert.equal(lines.length, 2);
  assert.equal(lines[0]!.type, "dispatch_outcome");
  assert.equal(lines[0]!.outcome, "paused");
  assert.equal(lines[1]!.type, "pause_event");
  assert.equal(lines[1]!.kind, "pause");
  assert.equal(lines[1]!.detection, "no_artifact");
});

test("recordGateDispatchTelemetry records paused (no pause_event) for a skip-badge resolution — never an unpaired resume_success", async () => {
  const repo = await tmpRepo("cdt-resume-");
  await recordGateDispatchTelemetry(repo, "SLICE-3", "devcrew:reviewer", {
    satisfied: true,
    reason: "workflow-state gate: review_skipped: lead-attested, no artifact found"
  });
  const lines = await readPauseLines(repo);
  assert.equal(lines.length, 1, "must record only the dispatch_outcome, never a pause_event");
  assert.equal(lines[0]!.type, "dispatch_outcome");
  assert.equal(lines[0]!.outcome, "paused");
  assert.ok(
    !lines.some((l) => l.type === "pause_event"),
    "must never emit resume_success (or any pause_event) for a skip-badge resolution"
  );
});

test("recordGateDispatchTelemetry writes nothing for a policy-based skip-badge (note doesn't cite a pause)", async () => {
  const repo = await tmpRepo("cdt-policy-skip-");
  await recordGateDispatchTelemetry(repo, "SLICE-5", "devcrew:verifier", {
    satisfied: true,
    reason: "workflow-state gate: validation_skipped: doc-only slice, no behavior changed"
  });
  const lines = await readPauseLines(repo);
  assert.equal(lines.length, 0);
});

// ---------------------------------------------------------------------------
// recordCloseDispatchTelemetry — end-to-end for both gates, never throws
// ---------------------------------------------------------------------------

test("recordCloseDispatchTelemetry never throws when gate derivation fails entirely", async () => {
  const repo = await tmpRepo("cdt-e2e-safe-");
  // No .claude/ tree at all -- deriveReviewGate/deriveValidationGate should
  // still resolve gracefully (readCrewWorkflowState tail-safe, artifact dirs
  // absent) rather than throwing out of recordCloseDispatchTelemetry.
  await recordCloseDispatchTelemetry(repo, "SLICE-4", null, null);
  // No assertion failure above is the pass condition; sanity-check no crash
  // left partial garbage behind either.
  const lines = await readPauseLines(repo);
  assert.ok(Array.isArray(lines));
});
