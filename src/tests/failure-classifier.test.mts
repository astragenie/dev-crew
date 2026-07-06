// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { makeTmpRepo } from "./_fixtures.mjs";
import { gradesRoot } from "../scripts/lib/paths.mjs";
import { recordDispatchOutcome } from "../scripts/lib/pause-telemetry.mjs";
import { logLearning } from "../scripts/lib/learnings.mjs";
import { resolveAuditLogPath } from "../scripts/lib/auto-dispatch.mjs";
import {
  classifyFailures,
  clusterFailures,
  rankClusters,
  inferFailureClass,
  normalizeRootCause,
  collectFailureSignals
} from "../scripts/lib/failure-classifier.mjs";

async function writeGradeFile(
  repo: string,
  sliceId: string,
  opts: { verdict?: string; gradedAt?: string; surprises?: string[]; followups?: string[] } = {}
): Promise<void> {
  const dir = gradesRoot(repo, null);
  await fs.mkdir(dir, { recursive: true });
  const { verdict, gradedAt = "2026-07-01", surprises = [], followups = [] } = opts;
  const body = [
    "---",
    `slice: ${sliceId}`,
    "feature: FEAT-999",
    `graded_at: ${gradedAt}`,
    ...(verdict !== undefined ? [`verdict: ${verdict}`] : []),
    "---",
    "",
    "## Surprises",
    "",
    ...surprises.map((s) => `- ${s}`),
    "",
    "## Followups",
    "",
    ...followups.map((f) => `- ${f}`),
    ""
  ].join("\n");
  await fs.writeFile(path.join(dir, `${sliceId}-grade.md`), body);
}

async function appendDispatchLog(repo: string, entry: Record<string, unknown>): Promise<void> {
  const logPath = resolveAuditLogPath(repo);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`);
}

// ---------------------------------------------------------------------------
// inferFailureClass / normalizeRootCause — pure helpers
// ---------------------------------------------------------------------------

test("inferFailureClass maps pause-shaped text to subagent_incomplete", () => {
  assert.equal(inferFailureClass("agent paused mid-sentence before commit"), "subagent_incomplete");
});

test("inferFailureClass falls back to other for unclassifiable text", () => {
  assert.equal(inferFailureClass("the sky is blue today"), "other");
});

test("inferFailureClass returns other for empty text", () => {
  assert.equal(inferFailureClass(""), "other");
});

test("normalizeRootCause lowercases, trims, and collapses whitespace", () => {
  assert.equal(normalizeRootCause("  Some   ROOT   cause  \n text "), "some root cause text");
});

// ---------------------------------------------------------------------------
// AC-1: clustering — one cluster per failure_class with correct count/exemplars/timestamps
// ---------------------------------------------------------------------------

test("classifyFailures groups multiple pause dispatches into one subagent_incomplete cluster", async () => {
  const repo = await makeTmpRepo("fc-ac1-");
  await recordDispatchOutcome(repo, {
    ts: "2026-07-01T00:00:00.000Z",
    agentRole: "crew:builder",
    sliceId: "FEAT-100",
    outcome: "paused"
  });
  await recordDispatchOutcome(repo, {
    ts: "2026-07-03T00:00:00.000Z",
    agentRole: "crew:builder",
    sliceId: "FEAT-101",
    outcome: "paused"
  });
  await recordDispatchOutcome(repo, {
    ts: "2026-07-02T00:00:00.000Z",
    agentRole: "crew:reviewer",
    sliceId: "FEAT-102",
    outcome: "completed"
  });

  const clusters = await classifyFailures(repo, { sinceDays: 30, nowMs: Date.parse("2026-07-04") });
  assert.equal(clusters.length, 1);
  const [cluster] = clusters;
  assert.equal(cluster.failure_class, "subagent_incomplete");
  assert.equal(cluster.count, 2);
  assert.equal(cluster.first_seen, "2026-07-01T00:00:00.000Z");
  assert.equal(cluster.last_seen, "2026-07-03T00:00:00.000Z");
  assert.deepEqual(
    cluster.exemplar_ids.sort(),
    ["FEAT-100@2026-07-01T00:00:00.000Z", "FEAT-101@2026-07-03T00:00:00.000Z"].sort()
  );
});

test("collectFailureSignals excludes signals outside the since window", async () => {
  const repo = await makeTmpRepo("fc-window-");
  await recordDispatchOutcome(repo, {
    ts: "2026-01-01T00:00:00.000Z",
    agentRole: "crew:builder",
    sliceId: "FEAT-OLD",
    outcome: "paused"
  });
  await recordDispatchOutcome(repo, {
    ts: "2026-07-01T00:00:00.000Z",
    agentRole: "crew:builder",
    sliceId: "FEAT-NEW",
    outcome: "paused"
  });
  const signals = await collectFailureSignals(repo, {
    sinceDays: 14,
    nowMs: Date.parse("2026-07-05T00:00:00.000Z")
  });
  assert.equal(signals.length, 1);
  assert.equal(signals[0]!.id, "FEAT-NEW@2026-07-01T00:00:00.000Z");
});

test("classifyFailures pulls dispatch-log ok:false rows into clusters", async () => {
  const repo = await makeTmpRepo("fc-dispatch-");
  await appendDispatchLog(repo, {
    timestamp: "2026-07-01T00:00:00.000Z",
    agent: "loop:architect",
    ok: false,
    skipReason: "cli-refusal-architect-disabled"
  });
  const clusters = await classifyFailures(repo, { sinceDays: 30, nowMs: Date.parse("2026-07-04") });
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.failure_class, "ignored_policy");
  assert.equal(clusters[0]!.count, 1);
});

test("classifyFailures uses explicit failure_class from learnings.jsonl entries", async () => {
  const repo = await makeTmpRepo("fc-learnings-");
  await logLearning(repo, {
    key: "test-validation-gap",
    insight: "coverage gap",
    failure_class: "validation_fail",
    root_cause: "missing edge-case test",
    recommended_fix: "add fixture"
  });
  const clusters = await classifyFailures(repo, { sinceDays: 365, nowMs: Date.now() });
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.failure_class, "validation_fail");
  assert.equal(clusters[0]!.representative_root_cause, "missing edge-case test");
  assert.equal(clusters[0]!.representative_fix, "add fixture");
});

test("classifyFailures infers failure_class for legacy learnings rows lacking the field", async () => {
  const repo = await makeTmpRepo("fc-legacy-learning-");
  await logLearning(repo, {
    key: "specialist-pause-recurrence",
    insight: "agent paused repeatedly"
  });
  const clusters = await classifyFailures(repo, { sinceDays: 365, nowMs: Date.now() });
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.failure_class, "subagent_incomplete");
});

// ---------------------------------------------------------------------------
// FEAT-228: Surprises/Followups bullets are failure signal regardless of
// verdict; a non-pass verdict remains an additional, stronger signal.
// ---------------------------------------------------------------------------

test("AC-1: a Surprises bullet with no verdict at all contributes failure signal", async () => {
  const repo = await makeTmpRepo("fc-ac1-grades-");
  await writeGradeFile(repo, "SLICE-01", {
    gradedAt: "2026-07-01",
    surprises: ["retry logic behaved unexpectedly under load"]
  });
  const signals = await collectFailureSignals(repo, {
    sinceDays: 30,
    nowMs: Date.parse("2026-07-05")
  });
  assert.equal(signals.length, 1);
  assert.equal(signals[0]!.id, "SLICE-01#surprises");
  assert.equal(signals[0]!.source, "grade");
});

test("AC-2: a Followups bullet is grouped with an inferred failure_class and carries grade id + section as evidence", async () => {
  const repo = await makeTmpRepo("fc-ac2-grades-");
  await writeGradeFile(repo, "SLICE-02", {
    gradedAt: "2026-07-02",
    followups: ["review the retry logic for correctness"]
  });
  const clusters = await classifyFailures(repo, { sinceDays: 30, nowMs: Date.parse("2026-07-05") });
  assert.equal(clusters.length, 1);
  assert.equal(
    clusters[0]!.failure_class,
    inferFailureClass("review the retry logic for correctness")
  );
  assert.deepEqual(clusters[0]!.exemplar_ids, ["SLICE-02#followups"]);
});

test("AC-3: a pass-like grade with no surprises/followups contributes no signal", async () => {
  const repo = await makeTmpRepo("fc-ac3-grades-");
  await writeGradeFile(repo, "SLICE-03", { verdict: "pass", gradedAt: "2026-07-01" });
  const clusters = await classifyFailures(repo, { sinceDays: 30, nowMs: Date.parse("2026-07-05") });
  assert.deepEqual(clusters, []);
});

test("a non-pass verdict still contributes its own additional, stronger signal on top of bullet signals", async () => {
  const repo = await makeTmpRepo("fc-verdict-plus-bullets-");
  await writeGradeFile(repo, "SLICE-04", {
    verdict: "fail",
    gradedAt: "2026-07-02",
    followups: ["test coverage gap for retry path"]
  });
  const signals = await collectFailureSignals(repo, {
    sinceDays: 30,
    nowMs: Date.parse("2026-07-05")
  });
  // One bullet-derived signal (verdict-independent) + one verdict-derived
  // signal (verdict-gated) — the non-pass verdict adds weight, it doesn't
  // replace the bullet signal.
  assert.equal(signals.length, 2);
  assert.deepEqual(signals.map((s) => s.id).sort(), ["SLICE-04", "SLICE-04#followups"]);
});

test("a pass-verdict grade with followups now contributes signal (grades source is no longer inert)", async () => {
  const repo = await makeTmpRepo("fc-grades-inert-fix-");
  await writeGradeFile(repo, "SLICE-05", {
    verdict: "pass",
    gradedAt: "2026-07-01",
    followups: ["review the retry logic"]
  });
  await writeGradeFile(repo, "SLICE-06", {
    verdict: "fail",
    gradedAt: "2026-07-02",
    followups: ["test coverage gap for retry path"]
  });
  const clusters = await classifyFailures(repo, { sinceDays: 30, nowMs: Date.parse("2026-07-05") });
  assert.equal(clusters.length, 1);
  assert.deepEqual(
    clusters[0]!.exemplar_ids.sort(),
    ["SLICE-05#followups", "SLICE-06", "SLICE-06#followups"].sort()
  );
});

// ---------------------------------------------------------------------------
// AC-2: deterministic frequency x recency ranking, tie-broken by class name
// ---------------------------------------------------------------------------

test("rankClusters sorts more-frequent-and-more-recent clusters above rarer/older ones", () => {
  const nowMs = Date.parse("2026-07-10T00:00:00.000Z");
  const clusters = [
    {
      failure_class: "other" as const,
      count: 1,
      exemplar_ids: ["a"],
      first_seen: "2026-01-01T00:00:00.000Z",
      last_seen: "2026-01-01T00:00:00.000Z",
      representative_root_cause: "rare old",
      representative_fix: ""
    },
    {
      failure_class: "bad_patch" as const,
      count: 5,
      exemplar_ids: ["b"],
      first_seen: "2026-07-09T00:00:00.000Z",
      last_seen: "2026-07-09T00:00:00.000Z",
      representative_root_cause: "frequent recent",
      representative_fix: ""
    }
  ];
  const ranked = rankClusters(clusters, nowMs);
  assert.equal(ranked[0]!.failure_class, "bad_patch");
  assert.equal(ranked[1]!.failure_class, "other");
});

test("rankClusters tie-breaks equal scores by ascending failure_class name", () => {
  const nowMs = Date.parse("2026-07-10T00:00:00.000Z");
  const same = {
    count: 3,
    exemplar_ids: ["x"],
    first_seen: "2026-07-01T00:00:00.000Z",
    last_seen: "2026-07-01T00:00:00.000Z",
    representative_root_cause: "same",
    representative_fix: ""
  };
  const clusters = [
    { ...same, failure_class: "validation_fail" as const },
    { ...same, failure_class: "bad_patch" as const }
  ];
  const ranked = rankClusters(clusters, nowMs);
  assert.deepEqual(
    ranked.map((c) => c.failure_class),
    ["bad_patch", "validation_fail"]
  );
});

test("clusterFailures caps exemplar_ids while preserving the true count", () => {
  const signals = Array.from({ length: 8 }, (_, i) => ({
    id: `s-${i}`,
    ts: `2026-07-0${(i % 9) + 1}T00:00:00.000Z`,
    failureClass: "other" as const,
    rootCause: "same cause",
    recommendedFix: "",
    source: "learning" as const
  }));
  const clusters = clusterFailures(signals, 3);
  assert.equal(clusters[0]!.count, 8);
  assert.equal(clusters[0]!.exemplar_ids.length, 3);
});

// ---------------------------------------------------------------------------
// AC-5: zero-failure window
// ---------------------------------------------------------------------------

test("classifyFailures returns an empty array for a repo with no failure signal", async () => {
  const repo = await makeTmpRepo("fc-empty-");
  const clusters = await classifyFailures(repo, { sinceDays: 14, nowMs: Date.now() });
  assert.deepEqual(clusters, []);
});
