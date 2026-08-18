// FEAT-259 SLICE-185 — orchestrator-watchdog.mts unit + integration coverage.
//
// Pure classify/decide functions are covered with synthetic observations.
// inspectWorktree is covered against REAL temp git repos (not hand-authored
// fixtures) per this repo's own lesson from FEAT-284/FEAT-288: hand-authored
// fixtures have twice hidden defects that only a real git round-trip surfaces.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  classifyLaneCondition,
  decideWatchdogAction,
  emptyLaneState,
  inspectWorktree,
  nudgeMessageFor,
  resolveFreshnessThresholdMs,
  type LaneObservation,
  type WatchdogLaneState
} from "../scripts/lib/orchestrator-watchdog.mjs";

function git(repo: string, ...args: string[]): void {
  const out = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.equal(out.status, 0, `git ${args.join(" ")} failed: ${out.stderr}`);
}

async function tmpRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "watchdog-test-"));
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Test");
  await fs.writeFile(path.join(repo, "README.md"), "hello\n");
  git(repo, "add", ".");
  git(repo, "commit", "-q", "-m", "init");
  return repo;
}

const FRESH_MS = 5 * 60 * 1000;

function baseObservation(overrides: Partial<LaneObservation> = {}): LaneObservation {
  return {
    agentId: "agent-a",
    idleNotificationSeen: false,
    reportReceived: false,
    worktree: null,
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// classifyLaneCondition — priority order + HARD GUARD
// ─────────────────────────────────────────────────────────────────────────────

test("classifyLaneCondition: fresh worktree activity is always 'running', even with uncommitted changes", () => {
  const now = Date.now();
  const obs = baseObservation({
    idleNotificationSeen: true,
    reportReceived: false,
    worktree: { exists: true, hasUncommittedChanges: true, freshestActivityMs: now - 1000 }
  });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "running");
});

test("classifyLaneCondition: stale worktree + uncommitted changes is 'stopped_uncommitted'", () => {
  const now = Date.now();
  const obs = baseObservation({
    worktree: { exists: true, hasUncommittedChanges: true, freshestActivityMs: now - FRESH_MS * 2 }
  });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "stopped_uncommitted");
});

test("classifyLaneCondition: idle without report, no worktree, is 'idle_without_report'", () => {
  const now = Date.now();
  const obs = baseObservation({
    idleNotificationSeen: true,
    reportReceived: false,
    worktree: null
  });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "idle_without_report");
});

test("classifyLaneCondition: idle observed but report already received is 'ok'", () => {
  const now = Date.now();
  const obs = baseObservation({ idleNotificationSeen: true, reportReceived: true, worktree: null });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "ok");
});

test("classifyLaneCondition: stale worktree, clean (no uncommitted changes), no idle signal is 'ok'", () => {
  const now = Date.now();
  const obs = baseObservation({
    worktree: { exists: true, hasUncommittedChanges: false, freshestActivityMs: now - FRESH_MS * 5 }
  });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "ok");
});

test("classifyLaneCondition: no worktree entry (exists: false) falls through to idle/report signal", () => {
  const now = Date.now();
  const obs = baseObservation({
    idleNotificationSeen: true,
    reportReceived: false,
    worktree: { exists: false, hasUncommittedChanges: false, freshestActivityMs: null }
  });
  assert.equal(classifyLaneCondition(obs, now, FRESH_MS), "idle_without_report");
});

// ─────────────────────────────────────────────────────────────────────────────
// decideWatchdogAction — auto-nudge-once bound + report_missing transition
// ─────────────────────────────────────────────────────────────────────────────

test("decideWatchdogAction: running/ok are always no-op regardless of prior state", () => {
  const state = emptyLaneState();
  const runningDecision = decideWatchdogAction("agent-a", "running", state);
  assert.equal(runningDecision.action, "none");
  assert.equal(runningDecision.message, null);
  assert.deepEqual(runningDecision.nextState, state);

  const okDecision = decideWatchdogAction("agent-a", "ok", state);
  assert.equal(okDecision.action, "none");
});

test("decideWatchdogAction: first idle_without_report nudges exactly once, then marks report_missing", () => {
  let state: WatchdogLaneState = emptyLaneState();

  const first = decideWatchdogAction("agent-a", "idle_without_report", state);
  assert.equal(first.action, "nudge_report");
  assert.ok(first.message?.includes("SendMessage"));
  assert.equal(first.nextState.nudgeCounts.idle_without_report, 1);
  assert.equal(first.nextState.reportMissing, false);
  state = first.nextState;

  // Second silent occurrence of the SAME condition -> report_missing, no nudge.
  const second = decideWatchdogAction("agent-a", "idle_without_report", state);
  assert.equal(second.action, "mark_report_missing");
  assert.equal(second.message, null);
  assert.equal(second.nextState.reportMissing, true);
  state = second.nextState;

  // Once report_missing, any further observation is a no-op for this lane.
  const third = decideWatchdogAction("agent-a", "idle_without_report", state);
  assert.equal(third.action, "none");
  const fourthDifferentCondition = decideWatchdogAction("agent-a", "stopped_uncommitted", state);
  assert.equal(fourthDifferentCondition.action, "none");
});

test("decideWatchdogAction: stopped_uncommitted nudges with commit-specific text, distinct from report nudge", () => {
  const state = emptyLaneState();
  const decision = decideWatchdogAction("agent-b", "stopped_uncommitted", state);
  assert.equal(decision.action, "nudge_commit");
  assert.ok(decision.message?.toLowerCase().includes("commit"));
  assert.ok(!decision.message!.toLowerCase().includes("sendmessage"));
});

test("decideWatchdogAction: nudge counts for two different conditions on the same agent are independent", () => {
  let state: WatchdogLaneState = emptyLaneState();
  const idleDecision = decideWatchdogAction("agent-c", "idle_without_report", state);
  state = idleDecision.nextState;
  // A DIFFERENT condition observed next tick should still get its own first nudge,
  // not be treated as the second occurrence of idle_without_report.
  const uncommittedDecision = decideWatchdogAction("agent-c", "stopped_uncommitted", state);
  assert.equal(uncommittedDecision.action, "nudge_commit");
  assert.equal(uncommittedDecision.nextState.reportMissing, false);
});

test("nudgeMessageFor: message text differs by condition", () => {
  const reportMsg = nudgeMessageFor("idle_without_report");
  const commitMsg = nudgeMessageFor("stopped_uncommitted");
  assert.notEqual(reportMsg, commitMsg);
  assert.ok(reportMsg.includes("SendMessage"));
  assert.ok(commitMsg.toLowerCase().includes("commit"));
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveFreshnessThresholdMs — configurable, documented default
// ─────────────────────────────────────────────────────────────────────────────

test("resolveFreshnessThresholdMs: defaults to 5 minutes when absent", () => {
  assert.equal(resolveFreshnessThresholdMs(null), 5 * 60 * 1000);
  assert.equal(resolveFreshnessThresholdMs({}), 5 * 60 * 1000);
});

test("resolveFreshnessThresholdMs: honors loop.watchdog.freshnessMinutes override", () => {
  const config = { loop: { watchdog: { freshnessMinutes: 10 } } };
  assert.equal(resolveFreshnessThresholdMs(config), 10 * 60 * 1000);
});

test("resolveFreshnessThresholdMs: falls back to default on invalid values", () => {
  assert.equal(
    resolveFreshnessThresholdMs({ loop: { watchdog: { freshnessMinutes: 0 } } }),
    5 * 60 * 1000
  );
  assert.equal(
    resolveFreshnessThresholdMs({ loop: { watchdog: { freshnessMinutes: -3 } } }),
    5 * 60 * 1000
  );
  assert.equal(
    resolveFreshnessThresholdMs({ loop: { watchdog: { freshnessMinutes: "10" } } }),
    5 * 60 * 1000
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// inspectWorktree — real temp git repos
// ─────────────────────────────────────────────────────────────────────────────

test("inspectWorktree: nonexistent path returns exists:false, no freshness signal", async () => {
  const missing = path.join(os.tmpdir(), `watchdog-does-not-exist-${Date.now()}`);
  const obs = await inspectWorktree(missing);
  assert.equal(obs.exists, false);
  assert.equal(obs.hasUncommittedChanges, false);
  assert.equal(obs.freshestActivityMs, null);
});

test("inspectWorktree: clean repo falls back to last-commit time as the freshness signal", async () => {
  const repo = await tmpRepo();
  const before = Date.now();
  const obs = await inspectWorktree(repo);
  assert.equal(obs.exists, true);
  assert.equal(obs.hasUncommittedChanges, false);
  assert.ok(obs.freshestActivityMs !== null);
  // Commit just happened — freshness signal should be close to "now", not stale.
  assert.ok(Math.abs(before - (obs.freshestActivityMs as number)) < 60_000);
});

test("inspectWorktree: uncommitted tracked edit is detected, freshness reflects the edit", async () => {
  const repo = await tmpRepo();
  await fs.writeFile(path.join(repo, "README.md"), "edited\n");
  const obs = await inspectWorktree(repo);
  assert.equal(obs.hasUncommittedChanges, true);
  assert.ok(obs.freshestActivityMs !== null);
});

test("inspectWorktree: uncommitted untracked new file is detected (not just tracked edits)", async () => {
  const repo = await tmpRepo();
  await fs.writeFile(path.join(repo, "new-file.txt"), "new\n");
  const obs = await inspectWorktree(repo);
  assert.equal(obs.hasUncommittedChanges, true);
});

test("inspectWorktree + classifyLaneCondition: aged uncommitted change classifies as stopped_uncommitted", async () => {
  const repo = await tmpRepo();
  const editedPath = path.join(repo, "README.md");
  await fs.writeFile(editedPath, "edited long ago\n");
  const oldTime = new Date(Date.now() - FRESH_MS * 3);
  await fs.utimes(editedPath, oldTime, oldTime);

  const obs = await inspectWorktree(repo);
  assert.equal(obs.hasUncommittedChanges, true);
  assert.ok(obs.freshestActivityMs !== null);

  const now = Date.now();
  const condition = classifyLaneCondition(baseObservation({ worktree: obs }), now, FRESH_MS);
  assert.equal(condition, "stopped_uncommitted");
});

test("inspectWorktree + classifyLaneCondition: freshly edited uncommitted change classifies as running (HARD GUARD)", async () => {
  const repo = await tmpRepo();
  await fs.writeFile(path.join(repo, "README.md"), "just edited\n");

  const obs = await inspectWorktree(repo);
  const now = Date.now();
  const condition = classifyLaneCondition(baseObservation({ worktree: obs }), now, FRESH_MS);
  assert.equal(condition, "running");
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end: real worktree through the full inspect -> classify -> decide
// pipeline, across three ticks, mirroring the SLICE-181 uncommitted-worktree
// scenario the FEAT's "New evidence" section documents.
// ─────────────────────────────────────────────────────────────────────────────

test("end-to-end: stopped-with-uncommitted-changes lane nudges once, then reports missing", async () => {
  const repo = await tmpRepo();
  const editedPath = path.join(repo, "README.md");
  await fs.writeFile(editedPath, "mid-edit, agent stopped\n");
  const oldTime = new Date(Date.now() - FRESH_MS * 3);
  await fs.utimes(editedPath, oldTime, oldTime);

  let state: WatchdogLaneState = emptyLaneState();

  // Tick 1: nudge to commit.
  const obs1 = await inspectWorktree(repo);
  const cond1 = classifyLaneCondition(baseObservation({ worktree: obs1 }), Date.now(), FRESH_MS);
  assert.equal(cond1, "stopped_uncommitted");
  const decision1 = decideWatchdogAction("builder-181", cond1, state);
  assert.equal(decision1.action, "nudge_commit");
  state = decision1.nextState;

  // Tick 2: still stopped, still uncommitted (agent never came back) -> report_missing.
  const obs2 = await inspectWorktree(repo);
  const cond2 = classifyLaneCondition(baseObservation({ worktree: obs2 }), Date.now(), FRESH_MS);
  assert.equal(cond2, "stopped_uncommitted");
  const decision2 = decideWatchdogAction("builder-181", cond2, state);
  assert.equal(decision2.action, "mark_report_missing");
  state = decision2.nextState;

  // Tick 3: orchestrator would now proceed from worktree evidence — no more nudges.
  const obs3 = await inspectWorktree(repo);
  const cond3 = classifyLaneCondition(baseObservation({ worktree: obs3 }), Date.now(), FRESH_MS);
  const decision3 = decideWatchdogAction("builder-181", cond3, state);
  assert.equal(decision3.action, "none");
});

test("end-to-end: agent resumes (fresh activity) between ticks is never nudged", async () => {
  const repo = await tmpRepo();
  const editedPath = path.join(repo, "README.md");
  await fs.writeFile(editedPath, "still working\n");
  // No utimes override — mtime is "now", so this always reads as running.

  const state: WatchdogLaneState = emptyLaneState();
  const obs = await inspectWorktree(repo);
  const condition = classifyLaneCondition(baseObservation({ worktree: obs }), Date.now(), FRESH_MS);
  assert.equal(condition, "running");
  const decision = decideWatchdogAction("builder-x", condition, state);
  assert.equal(decision.action, "none");
  assert.deepEqual(decision.nextState, state);
});
