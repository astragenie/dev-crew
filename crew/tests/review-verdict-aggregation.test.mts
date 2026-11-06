// FEAT-024 (SLICE-49) — explicit, per-reviewer aggregated review and
// validation verdicts; scaffolds never flip the gate.
//
// Problem this closes: crew.mts's write-review-result / write-validation-result
// silently accepted a missing --decision on a TERMINAL write (no --status, or
// --status completed) and the old handleReviewResult/handleValidationResult
// default-approved it — every reviewer's mandatory FIRST action
// (`--scaffold --status in-progress`, also decision-less) flowed through the
// same fallback, so the gate was green before the review even started. With
// a two-entry reviewers.ladder dispatched in parallel, a single reviewResult
// slot meant a reject-then-approve sequence could turn the gate green too.
//
// Covers (dispatch's explicit scenario list):
//   1. missing --decision on a terminal write -> exit 2 + stderr, for both
//      write-review-result and write-validation-result.
//   2. --scaffold / --status in-progress -> exit 0, gates.review untouched.
//   3. reviewer a=rejected then b=approved (and the mirror order) -> gate
//      status "failed", reviewers map {a: rejected, b: approved}.
//   4. run-brief under ladder ["A", "B"] -> one approved is "required",
//      both approved is "passed".
//   5. write-validation-result --decision skipped without --skip-reason ->
//      exit 2; with --skip-reason -> validation_skipped carries the reason.

import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";
import { runCrew } from "../scripts/crew.mjs";
import { registerWorkflowArtifact, loadWorkflowState } from "../scripts/lib/workflow-state.mjs";
import type { ArtifactRef } from "../scripts/lib/workflow-state.mjs";
import { makeTempDir, loadState, cliPath } from "./helpers/cli-fixtures.mjs";

// process.exit(2) refusal paths must run out-of-process — same reasoning as
// enum-verdicts.test.mts / crew-write-review-result.test.mts: calling them
// via the in-process runCrew() would kill the test runner itself.
function runCli(args: string[]) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    timeout: 30_000
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

async function cleanup(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// AC-1 / AC-5 (first half): missing --decision on a terminal write exits 2
// ---------------------------------------------------------------------------

test("write-review-result: no --status and no --decision exits 2 with the required-decision message", async () => {
  const repoPath = await makeTempDir("review-verdict-missing-decision-");
  try {
    const { status, stderr } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "No decision review",
      "--summary",
      "forgot --decision"
    ]);
    expect(status, "expected exit 2 with no --status and no --decision").toBe(2);
    expect(stderr).toMatch(/--decision is required/);
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: --status completed and no --decision exits 2 with the required-decision message", async () => {
  const repoPath = await makeTempDir("review-verdict-completed-no-decision-");
  try {
    const { status, stderr } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "No decision review",
      "--status",
      "completed",
      "--summary",
      "forgot --decision"
    ]);
    expect(status, "expected exit 2 with --status completed and no --decision").toBe(2);
    expect(stderr).toMatch(/--decision is required/);
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: no --status and no --decision exits 2 with the required-decision message", async () => {
  const repoPath = await makeTempDir("validation-verdict-missing-decision-");
  try {
    const { status, stderr } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "No decision validation",
      "--summary",
      "forgot --decision"
    ]);
    expect(status, "expected exit 2 with no --status and no --decision").toBe(2);
    expect(stderr).toMatch(/--decision is required/);
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// AC-2: --scaffold / --status in-progress register the path only
// ---------------------------------------------------------------------------

test("write-review-result: --scaffold --status in-progress with no --decision exits 0 and leaves gates.review untouched", async () => {
  const repoPath = await makeTempDir("review-verdict-scaffold-");
  try {
    const { status, stdout } = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Scaffold review",
      "--scaffold",
      "--status",
      "in-progress",
      "--summary",
      "starting investigation"
    ]);
    expect(status, "scaffold write with no --decision must exit 0").toBe(0);
    const result = JSON.parse(stdout);
    expect(result.path, "artifact path must be recorded").toBeTruthy();

    const state = await loadState(repoPath);
    expect(state.currentRun.artifacts.reviewResult, "artifact path registered on the run").toBe(
      result.path
    );
    expect(
      state.currentRun.gates.review,
      "gates.review must be unchanged (no review_passed/review_required flip) — null since no run-brief ran first"
    ).toBeNull();
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: --scaffold --status in-progress with no --decision exits 0 and leaves gates.validation untouched", async () => {
  const repoPath = await makeTempDir("validation-verdict-scaffold-");
  try {
    const { status, stdout } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Scaffold validation",
      "--scaffold",
      "--status",
      "in-progress",
      "--summary",
      "starting investigation"
    ]);
    expect(status, "scaffold write with no --decision must exit 0").toBe(0);
    const state = await loadState(repoPath);
    expect(state.currentRun.gates.validation).toBeNull();
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// AC-3: per-reviewer aggregation — any rejected dominates, map keyed by role
// ---------------------------------------------------------------------------

test("registerWorkflowArtifact: reviewer a=rejected then b=approved -> gate failed, reviewers map recorded", async () => {
  const repoPath = await makeTempDir("review-verdict-reject-then-approve-");
  try {
    const artifact: ArtifactRef = { kind: "review-result", path: "review-a.md", title: "t" };
    await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "a",
      verdict: "rejected",
      summary: "missing null guard"
    });
    const run = await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "b",
      verdict: "approved",
      summary: "looks fine to me"
    });
    expect(run?.gates.review?.status, "any rejected dominates -> failed").toBe("failed");
    expect(run?.gates.review?.reviewers).toEqual({ a: "rejected", b: "approved" });
  } finally {
    await cleanup(repoPath);
  }
});

test("registerWorkflowArtifact: reviewer b=approved then a=rejected (mirror order) -> gate failed, reviewers map recorded", async () => {
  const repoPath = await makeTempDir("review-verdict-approve-then-reject-");
  try {
    const artifact: ArtifactRef = { kind: "review-result", path: "review-b.md", title: "t" };
    await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "b",
      verdict: "approved",
      summary: "looks fine to me"
    });
    const run = await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "a",
      verdict: "rejected",
      summary: "missing null guard"
    });
    expect(run?.gates.review?.status, "any rejected dominates regardless of order -> failed").toBe(
      "failed"
    );
    expect(run?.gates.review?.reviewers).toEqual({ a: "rejected", b: "approved" });
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// AC-4: required set snapshotted from reviewers.ladder at run-brief time
// ---------------------------------------------------------------------------

test("write-run-brief snapshots reviewers.ladder into gates.review.required; gate is 'required' until every entry has written, then 'passed'", async () => {
  const repoPath = await makeTempDir("review-verdict-ladder-");
  try {
    await fs.mkdir(path.join(repoPath, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repoPath, ".claude", "loop.json"),
      JSON.stringify({ reviewers: { ladder: ["A", "B"] } })
    );

    const briefResult = await runCrew([
      "write-run-brief",
      "--repo",
      repoPath,
      "--title",
      "Ladder test run"
    ]);
    expect(briefResult.code).toBe(0);

    let state = await loadWorkflowState(repoPath);
    expect(
      state.currentRun?.gates.review?.required,
      "required set snapshotted from reviewers.ladder at run-brief time"
    ).toEqual(["A", "B"]);
    expect(state.currentRun?.gates.review?.status).toBe("required");

    const artifact: ArtifactRef = { kind: "review-result", path: "review-A.md", title: "t" };
    await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "A",
      verdict: "approved",
      summary: "A approves"
    });
    state = await loadWorkflowState(repoPath);
    expect(
      state.currentRun?.gates.review?.status,
      "only one of two required reviewers has written -> still required"
    ).toBe("required");
    expect(state.currentRun?.gates.review?.reviewers).toEqual({ A: "approved" });

    const run = await registerWorkflowArtifact(repoPath, artifact, {
      reviewer: "B",
      verdict: "approved",
      summary: "B approves"
    });
    expect(
      run?.gates.review?.status,
      "every required reviewer has now written an approving verdict -> passed"
    ).toBe("passed");
    expect(run?.gates.review?.reviewers).toEqual({ A: "approved", B: "approved" });
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// Review B BLOCKER fix: `required` entries are SLOTS, not reviewer-name
// labels — live reviewers write under their own `--reviewer` key (e.g.
// "typescript-reviewer", "reviewer"), which never matches a ladder label
// like "A"/"B". The gate must resolve by COUNT of distinct approving
// reviewers against the required slot count, not by name lookup.
// ---------------------------------------------------------------------------

test("write-review-result: ladder [A,B] slots filled by non-ladder-named reviewers -> required, then passed", async () => {
  const repoPath = await makeTempDir("review-verdict-slots-approve-");
  try {
    await fs.mkdir(path.join(repoPath, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repoPath, ".claude", "loop.json"),
      JSON.stringify({ reviewers: { ladder: ["A", "B"] } })
    );

    const briefResult = await runCrew([
      "write-run-brief",
      "--repo",
      repoPath,
      "--title",
      "Slot semantics test run"
    ]);
    expect(briefResult.code).toBe(0);

    const first = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "TS review",
      "--reviewer",
      "typescript-reviewer",
      "--decision",
      "approved",
      "--summary",
      "looks fine",
      "--test-summary",
      "covered"
    ]);
    expect(first.status).toBe(0);

    let state = await loadState(repoPath);
    expect(
      state.currentRun.gates.review.status,
      "only one of two required slots filled -> still required, even though the reviewer key doesn't match a ladder label"
    ).toBe("required");
    expect(state.currentRun.gates.review.reviewers).toEqual({ "typescript-reviewer": "approved" });

    const second = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Generalist review",
      "--reviewer",
      "reviewer",
      "--decision",
      "approved",
      "--summary",
      "also fine",
      "--test-summary",
      "covered"
    ]);
    expect(second.status).toBe(0);

    state = await loadState(repoPath);
    expect(
      state.currentRun.gates.review.status,
      "second distinct approving reviewer fills the second slot -> passed"
    ).toBe("passed");
    expect(state.currentRun.gates.review.reviewers).toEqual({
      "typescript-reviewer": "approved",
      reviewer: "approved"
    });
  } finally {
    await cleanup(repoPath);
  }
});

test("write-review-result: ladder [A,B] slots filled by non-ladder-named reviewers, one rejects -> failed", async () => {
  const repoPath = await makeTempDir("review-verdict-slots-reject-");
  try {
    await fs.mkdir(path.join(repoPath, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repoPath, ".claude", "loop.json"),
      JSON.stringify({ reviewers: { ladder: ["A", "B"] } })
    );

    const briefResult = await runCrew([
      "write-run-brief",
      "--repo",
      repoPath,
      "--title",
      "Slot semantics reject test run"
    ]);
    expect(briefResult.code).toBe(0);

    const first = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "TS review",
      "--reviewer",
      "typescript-reviewer",
      "--decision",
      "approved",
      "--summary",
      "looks fine",
      "--test-summary",
      "covered"
    ]);
    expect(first.status).toBe(0);

    const second = runCli([
      "write-review-result",
      "--repo",
      repoPath,
      "--title",
      "Generalist review",
      "--reviewer",
      "reviewer",
      "--decision",
      "rejected",
      "--summary",
      "missing edge case handling"
    ]);
    expect(second.status).toBe(0);

    const state = await loadState(repoPath);
    expect(
      state.currentRun.gates.review.status,
      "a rejected verdict dominates regardless of reviewer key naming"
    ).toBe("failed");
    expect(state.currentRun.gates.review.reviewers).toEqual({
      "typescript-reviewer": "approved",
      reviewer: "rejected"
    });
  } finally {
    await cleanup(repoPath);
  }
});

// ---------------------------------------------------------------------------
// AC-5: write-validation-result --decision skipped requires --skip-reason
// ---------------------------------------------------------------------------

test("write-validation-result: --decision skipped without --skip-reason exits 2", async () => {
  const repoPath = await makeTempDir("validation-verdict-skip-no-reason-");
  try {
    const { status, stderr } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Skip without reason",
      "--decision",
      "skipped",
      "--summary",
      "env unavailable"
    ]);
    expect(status).toBe(2);
    expect(stderr).toMatch(/skip_reason/);
  } finally {
    await cleanup(repoPath);
  }
});

test("write-validation-result: --decision skipped with --skip-reason exits 0 and validation_skipped carries the reason", async () => {
  const repoPath = await makeTempDir("validation-verdict-skip-with-reason-");
  try {
    const { status } = runCli([
      "write-validation-result",
      "--repo",
      repoPath,
      "--title",
      "Skip with reason",
      "--decision",
      "skipped",
      "--skip-reason",
      "staging environment unavailable"
    ]);
    expect(status).toBe(0);

    const state = await loadState(repoPath);
    expect(state.currentRun.gates.validation.status).toBe("skipped");
    expect(state.currentRun.gates.validation.note).toMatch(/staging environment unavailable/);
    expect(state.currentRun.gates.validation.validators).toEqual({ verifier: "skipped" });
  } finally {
    await cleanup(repoPath);
  }
});
