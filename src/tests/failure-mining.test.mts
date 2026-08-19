// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { makeTmpRepo } from "./_fixtures.mjs";
import { recordDispatchOutcome } from "../scripts/lib/pause-telemetry.mjs";
import { listAllLearnings, learningsPath } from "../scripts/lib/learnings.mjs";
import { miningRoot } from "../scripts/lib/paths.mjs";
import { mineFailures } from "../scripts/lib/failure-mining.mjs";

async function seedPausedDispatch(repo: string, sliceId: string, ts: string): Promise<void> {
  await recordDispatchOutcome(repo, {
    ts,
    agentRole: "devcrew:builder",
    sliceId,
    outcome: "paused"
  });
}

// ---------------------------------------------------------------------------
// AC-3 + AC-6: writes candidate lessons + a dated report, never mutates source
// ---------------------------------------------------------------------------

test("mineFailures writes a candidate lesson per top cluster and a dated report", async () => {
  const repo = await makeTmpRepo("fm-basic-");
  await seedPausedDispatch(repo, "FEAT-200", "2026-07-01T00:00:00.000Z");
  await seedPausedDispatch(repo, "FEAT-201", "2026-07-02T00:00:00.000Z");

  const nowMs = Date.parse("2026-07-05T00:00:00.000Z");
  const result = await mineFailures(repo, { sinceDays: 14, nowMs });

  assert.equal(result.clusters.length, 1);
  assert.equal(result.lessonsWritten.length, 1);
  assert.equal(result.lessonsWritten[0]!.failure_class, "subagent_incomplete");
  assert.ok(result.lessonsWritten[0]!.key.startsWith("mined:"));

  const { items } = { items: await listAllLearnings(repo) };
  const mined = items.find((e: any) => e.key === result.lessonsWritten[0]!.key);
  assert.ok(mined, "candidate lesson row should exist in learnings.jsonl");
  assert.equal(mined.status, "candidate");
  assert.equal(mined.failure_class, "subagent_incomplete");
  assert.ok(Array.isArray(mined.evidence) && mined.evidence.length > 0);

  const reportContent = await fs.readFile(result.reportPath, "utf8");
  assert.match(reportContent, /# Failure mining/);
  assert.match(reportContent, /subagent_incomplete/);
  assert.equal(path.dirname(result.reportPath), miningRoot(repo, null));
});

test("mineFailures never mutates the source pause-events store", async () => {
  const repo = await makeTmpRepo("fm-readonly-");
  await seedPausedDispatch(repo, "FEAT-300", "2026-07-01T00:00:00.000Z");
  const { pauseEventsPath } = await import("../scripts/lib/pause-telemetry.mjs");
  const before = await fs.readFile(pauseEventsPath(repo), "utf8");

  await mineFailures(repo, { sinceDays: 14, nowMs: Date.parse("2026-07-05T00:00:00.000Z") });

  const after = await fs.readFile(pauseEventsPath(repo), "utf8");
  assert.equal(after, before);
});

// ---------------------------------------------------------------------------
// AC-4: idempotent — re-running the same window writes no duplicate lessons
// ---------------------------------------------------------------------------

test("mineFailures is idempotent across two runs of the same window", async () => {
  const repo = await makeTmpRepo("fm-idempotent-");
  await seedPausedDispatch(repo, "FEAT-400", "2026-07-01T00:00:00.000Z");
  await seedPausedDispatch(repo, "FEAT-401", "2026-07-02T00:00:00.000Z");

  const opts = { sinceDays: 14, nowMs: Date.parse("2026-07-05T00:00:00.000Z") };
  const first = await mineFailures(repo, opts);
  const second = await mineFailures(repo, opts);

  assert.equal(first.lessonsWritten.length, 1);
  assert.equal(second.lessonsWritten.length, 0);
  assert.deepEqual(
    second.skippedDuplicates,
    first.lessonsWritten.map((w) => w.key)
  );

  const all = await listAllLearnings(repo);
  const minedRows = all.filter((e: any) => typeof e.key === "string" && e.key.startsWith("mined:"));
  assert.equal(minedRows.length, 1);
});

test("a mined candidate lesson is not re-ingested as failure signal on the next classify pass", async () => {
  const repo = await makeTmpRepo("fm-no-feedback-loop-");
  await seedPausedDispatch(repo, "FEAT-450", "2026-07-01T00:00:00.000Z");
  await seedPausedDispatch(repo, "FEAT-451", "2026-07-02T00:00:00.000Z");

  const opts = { sinceDays: 14, nowMs: Date.parse("2026-07-05T00:00:00.000Z") };
  const first = await mineFailures(repo, opts);
  assert.equal(first.clusters[0]!.count, 2);

  // Re-running classifyFailures alone (same window) must see the same raw
  // count — the mined:<hash> row written above must not double as a fresh
  // subagent_incomplete signal, or repeated mining runs would inflate counts
  // without bound.
  const { classifyFailures } = await import("../scripts/lib/failure-classifier.mjs");
  const clusters = await classifyFailures(repo, opts);
  assert.equal(clusters[0]!.count, 2);
});

test("mineFailures over a later, non-overlapping window with a new root cause adds a fresh lesson", async () => {
  const repo = await makeTmpRepo("fm-fresh-window-");
  await seedPausedDispatch(repo, "FEAT-500", "2026-07-01T00:00:00.000Z");
  await mineFailures(repo, { sinceDays: 14, nowMs: Date.parse("2026-07-05T00:00:00.000Z") });

  const { recordDispatchOutcome: record2 } = await import("../scripts/lib/pause-telemetry.mjs");
  await record2(repo, {
    ts: "2026-08-01T00:00:00.000Z",
    agentRole: "devcrew:frontend-dev",
    sliceId: "FEAT-600",
    outcome: "paused"
  });
  const second = await mineFailures(repo, {
    sinceDays: 14,
    nowMs: Date.parse("2026-08-05T00:00:00.000Z")
  });

  // Same failure_class but a different representative root cause (different
  // agentRole in the synthesized text) hashes to a different key, so this is
  // a legitimately new cluster identity, not a duplicate.
  const all = await listAllLearnings(repo);
  const minedRows = all.filter((e: any) => typeof e.key === "string" && e.key.startsWith("mined:"));
  assert.equal(minedRows.length, 2);
  assert.equal(second.lessonsWritten.length, 1);
  assert.ok(second.reportPath.includes("2026-08-05"));
});

// ---------------------------------------------------------------------------
// AC-5: zero-failure window
// ---------------------------------------------------------------------------

test("mineFailures on a zero-failure window writes a no-clusters report and no lessons, without throwing", async () => {
  const repo = await makeTmpRepo("fm-empty-");
  const result = await mineFailures(repo, { sinceDays: 14, nowMs: Date.now() });

  assert.deepEqual(result.clusters, []);
  assert.deepEqual(result.lessonsWritten, []);
  const reportContent = await fs.readFile(result.reportPath, "utf8");
  assert.match(reportContent, /No failure clusters found/);

  await fs.access(learningsPath(repo)).catch((err) => {
    assert.equal(
      err.code,
      "ENOENT",
      "learnings.jsonl should not be created when there is nothing to write"
    );
  });
});
