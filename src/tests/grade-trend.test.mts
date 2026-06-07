import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  readGradeTrend,
  recordGradeScore,
  checkGradeTrend,
  checkMarathonMilestone
} from "../scripts/lib/grade-trend.mjs";

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude", "state"), { recursive: true });
  return repo;
}

test("default state — no state file → { scores: [], consecutiveBelow: 0 }", async () => {
  const repo = await tmpRepo("al-gt-default-");
  const state = await readGradeTrend(repo);
  assert.deepEqual(state, { scores: [], consecutiveBelow: 0 });
});

test("score accumulation — keeps last 3, oldest dropped", async () => {
  const repo = await tmpRepo("al-gt-window-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.8 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.75 });
  await recordGradeScore(repo, { sliceId: "SLICE-03", avg: 0.9 });
  await recordGradeScore(repo, { sliceId: "SLICE-04", avg: 0.7 });
  const state = await readGradeTrend(repo);
  assert.equal(state.scores.length, 3);
  assert.equal(state.scores[0].sliceId, "SLICE-02");
  assert.equal(state.scores[1].sliceId, "SLICE-03");
  assert.equal(state.scores[2].sliceId, "SLICE-04");
});

test("consecutiveBelow resets when score passes threshold", async () => {
  const repo = await tmpRepo("al-gt-reset-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.5 }); // below 0.65
  let state = await readGradeTrend(repo);
  assert.equal(state.consecutiveBelow, 1);

  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.8 }); // above 0.65
  state = await readGradeTrend(repo);
  assert.equal(state.consecutiveBelow, 0);
});

test("consecutiveBelow=2 — two consecutive slices below threshold", async () => {
  const repo = await tmpRepo("al-gt-consec-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.6 }); // below
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.55 }); // below
  const state = await readGradeTrend(repo);
  assert.equal(state.consecutiveBelow, 2);
});

test("checkGradeTrend returns null when consecutiveBelow < 2", async () => {
  const repo = await tmpRepo("al-gt-null-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.6 }); // only 1 below
  const signal = await checkGradeTrend(repo);
  assert.equal(signal, null);
});

test("checkGradeTrend returns stop signal when consecutiveBelow >= 2", async () => {
  const repo = await tmpRepo("al-gt-stop-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.5 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.55 });
  const signal = await checkGradeTrend(repo);
  assert.ok(signal !== null, "should return a signal");
  assert.equal(signal.shouldStop, true);
  assert.ok(typeof signal.reason === "string");
  assert.equal(signal.consecutiveBelow, 2);
  assert.ok(typeof signal.threshold === "number");
});

test("zero-score (avg=0) is skipped — not counted as below threshold", async () => {
  const repo = await tmpRepo("al-gt-zero-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.5 }); // below
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0 }); // skip
  const state = await readGradeTrend(repo);
  // SLICE-02 avg=0 is skipped → consecutiveBelow still 1 (not reset, not incremented)
  assert.equal(state.consecutiveBelow, 1);
  // scores window should not include the zero-avg entry
  assert.equal(state.scores.length, 1);
  assert.equal(state.scores[0].sliceId, "SLICE-01");
});

test("custom threshold from config — respects loop.gradeTrendThreshold", async () => {
  const repo = await tmpRepo("al-gt-threshold-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.7 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.72 });
  // With default threshold 0.65, avg=0.7 is above → no stop
  const defaultSignal = await checkGradeTrend(repo);
  assert.equal(defaultSignal, null);
  // With threshold 0.8, avg=0.7 and 0.72 are both below → stop
  const config = { loop: { gradeTrendThreshold: 0.8 } };
  const highSignal = await checkGradeTrend(repo, config);
  assert.ok(highSignal !== null);
  assert.equal(highSignal.shouldStop, true);
  assert.equal(highSignal.threshold, 0.8);
});

// --- checkMarathonMilestone tests ---

test("checkMarathonMilestone returns null when fewer than window slices recorded", async () => {
  const repo = await tmpRepo("al-gt-marathon-short-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.9 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.85 });
  // window size = 3, only 2 scores → no milestone
  const result = await checkMarathonMilestone(repo);
  assert.equal(result, null);
});

test("checkMarathonMilestone returns null when any recent score is below threshold", async () => {
  const repo = await tmpRepo("al-gt-marathon-low-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.9 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.6 }); // below 0.65
  await recordGradeScore(repo, { sliceId: "SLICE-03", avg: 0.88 });
  const result = await checkMarathonMilestone(repo);
  assert.equal(result, null);
});

test("checkMarathonMilestone returns milestone when all recent scores are at or above threshold", async () => {
  const repo = await tmpRepo("al-gt-marathon-pass-");
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.8 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.75 });
  await recordGradeScore(repo, { sliceId: "SLICE-03", avg: 0.9 });
  const result = await checkMarathonMilestone(repo);
  assert.ok(result !== null, "should return a milestone");
  assert.equal(result.milestone, true);
  assert.equal(result.consecutiveAbove, 3);
  assert.ok(result.avgScore > 0);
  assert.equal(result.threshold, 0.65);
});

test("checkMarathonMilestone respects custom milestoneLength config", async () => {
  const repo = await tmpRepo("al-gt-marathon-cfg-");
  // Only 2 scores but milestoneLength=2 → should trigger if both above threshold
  await recordGradeScore(repo, { sliceId: "SLICE-01", avg: 0.9 });
  await recordGradeScore(repo, { sliceId: "SLICE-02", avg: 0.8 });
  const config = { loop: { marathonMilestoneLength: 2 } };
  const result = await checkMarathonMilestone(repo, config);
  assert.ok(result !== null);
  assert.equal(result.consecutiveAbove, 2);
});
