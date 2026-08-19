import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  recordPauseEvent,
  recordDispatchOutcome,
  summarizePauseRate,
  pauseEventsPath,
  evaluatePauseTelemetryStaleness,
  resolvePauseTelemetryStaleAfterDays,
  DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS
} from "../scripts/lib/pause-telemetry.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readLines(filePath: string): Promise<Record<string, unknown>[]> {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// ---------------------------------------------------------------------------
// recordPauseEvent / recordDispatchOutcome — event append shape
// ---------------------------------------------------------------------------

test("recordPauseEvent appends one JSON line with the documented shape", async () => {
  const repo = await tmpRepo("pt-pause-shape-");
  await recordPauseEvent(repo, {
    sliceId: "SLICE-99",
    agentRole: "devcrew:fullstack-dev",
    dispatchId: "dispatch-1",
    kind: "pause",
    detection: "no_artifact",
    notes: "no handoff artifact found"
  });

  const lines = await readLines(pauseEventsPath(repo));
  assert.equal(lines.length, 1);
  const record = lines[0]!;
  assert.equal(record.type, "pause_event");
  assert.equal(record.sliceId, "SLICE-99");
  assert.equal(record.agentRole, "devcrew:fullstack-dev");
  assert.equal(record.dispatchId, "dispatch-1");
  assert.equal(record.kind, "pause");
  assert.equal(record.detection, "no_artifact");
  assert.equal(record.notes, "no handoff artifact found");
  assert.ok(typeof record.ts === "string" && record.ts.length > 0);
});

test("recordPauseEvent honors a caller-supplied ts instead of stamping now()", async () => {
  const repo = await tmpRepo("pt-pause-ts-");
  await recordPauseEvent(repo, {
    ts: "2026-07-01T00:00:00.000Z",
    agentRole: "devcrew:reviewer",
    kind: "resume_success",
    detection: "scaffold_in_progress"
  });
  const [record] = await readLines(pauseEventsPath(repo));
  assert.equal(record!.ts, "2026-07-01T00:00:00.000Z");
});

test("recordPauseEvent omits optional fields when not provided", async () => {
  const repo = await tmpRepo("pt-pause-optional-");
  await recordPauseEvent(repo, {
    agentRole: "devcrew:verifier",
    kind: "pickup",
    detection: "mid_sentence"
  });
  const [record] = await readLines(pauseEventsPath(repo));
  assert.equal("sliceId" in record!, false);
  assert.equal("dispatchId" in record!, false);
  assert.equal("notes" in record!, false);
});

test("recordDispatchOutcome appends one JSON line with the documented shape", async () => {
  const repo = await tmpRepo("pt-outcome-shape-");
  await recordDispatchOutcome(repo, {
    agentRole: "devcrew:fullstack-dev",
    sliceId: "SLICE-99",
    outcome: "paused"
  });
  const lines = await readLines(pauseEventsPath(repo));
  assert.equal(lines.length, 1);
  const record = lines[0]!;
  assert.equal(record.type, "dispatch_outcome");
  assert.equal(record.agentRole, "devcrew:fullstack-dev");
  assert.equal(record.sliceId, "SLICE-99");
  assert.equal(record.outcome, "paused");
  assert.ok(typeof record.ts === "string" && record.ts.length > 0);
});

test("recordPauseEvent and recordDispatchOutcome share one file, interleaved in write order", async () => {
  const repo = await tmpRepo("pt-shared-file-");
  await recordDispatchOutcome(repo, {
    agentRole: "devcrew:fullstack-dev",
    outcome: "completed"
  });
  await recordPauseEvent(repo, {
    agentRole: "devcrew:reviewer",
    kind: "pause",
    detection: "no_artifact"
  });
  await recordDispatchOutcome(repo, {
    agentRole: "devcrew:reviewer",
    outcome: "paused"
  });

  const lines = await readLines(pauseEventsPath(repo));
  assert.equal(lines.length, 3);
  assert.deepEqual(
    lines.map((l) => l.type),
    ["dispatch_outcome", "pause_event", "dispatch_outcome"]
  );
});

// ---------------------------------------------------------------------------
// summarizePauseRate — summary math
// ---------------------------------------------------------------------------

test("summarizePauseRate returns all-zero summary for a missing file", async () => {
  const repo = await tmpRepo("pt-missing-");
  const summary = await summarizePauseRate(repo);
  assert.deepEqual(summary, {
    dispatches: 0,
    pauses: 0,
    pauseRate: 0,
    resumeSuccessRate: 0
  });
});

test("summarizePauseRate returns all-zero summary when zero dispatch outcomes exist", async () => {
  const repo = await tmpRepo("pt-zero-dispatch-");
  // Only a pause_event, no dispatch_outcome rows -- denominator is 0.
  await recordPauseEvent(repo, {
    agentRole: "devcrew:fullstack-dev",
    kind: "pause",
    detection: "mid_sentence"
  });
  const summary = await summarizePauseRate(repo);
  assert.equal(summary.dispatches, 0);
  assert.equal(summary.pauses, 0);
  assert.equal(summary.pauseRate, 0);
});

test("summarizePauseRate computes pauseRate from dispatch outcomes", async () => {
  const repo = await tmpRepo("pt-math-");
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "paused" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });

  const summary = await summarizePauseRate(repo);
  assert.equal(summary.dispatches, 4);
  assert.equal(summary.pauses, 1);
  assert.equal(summary.pauseRate, 0.25);
});

test("summarizePauseRate windowN limits the denominator to the last N dispatches", async () => {
  const repo = await tmpRepo("pt-window-");
  // 3 completed, then 2 paused -- last-2 window should read 100% pause rate.
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "paused" });
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "paused" });

  const windowed = await summarizePauseRate(repo, 2);
  assert.equal(windowed.dispatches, 2);
  assert.equal(windowed.pauses, 2);
  assert.equal(windowed.pauseRate, 1);

  const unwindowed = await summarizePauseRate(repo);
  assert.equal(unwindowed.dispatches, 5);
  assert.equal(unwindowed.pauses, 2);
  assert.equal(unwindowed.pauseRate, 0.4);
});

test("summarizePauseRate computes resumeSuccessRate from pause-event kinds", async () => {
  const repo = await tmpRepo("pt-resume-");
  await recordPauseEvent(repo, {
    agentRole: "a",
    kind: "pause",
    detection: "no_artifact"
  });
  await recordPauseEvent(repo, {
    agentRole: "a",
    kind: "resume_success",
    detection: "no_artifact"
  });
  await recordPauseEvent(repo, {
    agentRole: "a",
    kind: "pause",
    detection: "mid_sentence"
  });
  // Second pause never resolves -- no matching resume_success.

  const summary = await summarizePauseRate(repo);
  assert.equal(summary.resumeSuccessRate, 0.5);
});

test("summarizePauseRate ignores malformed JSON lines instead of throwing", async () => {
  const repo = await tmpRepo("pt-malformed-");
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  await fs.appendFile(pauseEventsPath(repo), "{ not json\n");
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "paused" });

  const summary = await summarizePauseRate(repo);
  assert.equal(summary.dispatches, 2);
  assert.equal(summary.pauses, 1);
});

// ---------------------------------------------------------------------------
// FEAT-275 / SLICE-178 — evaluatePauseTelemetryStaleness
// ---------------------------------------------------------------------------

test("resolvePauseTelemetryStaleAfterDays falls back to the default when unset", () => {
  assert.equal(resolvePauseTelemetryStaleAfterDays(null), DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS);
  assert.equal(
    resolvePauseTelemetryStaleAfterDays({ loop: {} }),
    DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS
  );
  assert.equal(
    resolvePauseTelemetryStaleAfterDays({ loop: { pauseTelemetryStaleAfterDays: 0 } }),
    DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS
  );
});

test("resolvePauseTelemetryStaleAfterDays honors a valid configured override", () => {
  assert.equal(
    resolvePauseTelemetryStaleAfterDays({ loop: { pauseTelemetryStaleAfterDays: 2 } }),
    2
  );
});

test("evaluatePauseTelemetryStaleness is tail-safe for a missing file — stale with no newestTs", async () => {
  const repo = await tmpRepo("pt-stale-missing-");
  const result = await evaluatePauseTelemetryStaleness(repo, null);
  assert.deepEqual(result, { stale: true, newestTs: null, thresholdDays: 7 });
});

test("evaluatePauseTelemetryStaleness is tail-safe for malformed lines — never throws", async () => {
  const repo = await tmpRepo("pt-stale-malformed-");
  await fs.mkdir(path.dirname(pauseEventsPath(repo)), { recursive: true });
  await fs.writeFile(pauseEventsPath(repo), "{ not json\nalso not json\n");
  const result = await evaluatePauseTelemetryStaleness(repo, null);
  assert.equal(result.stale, true);
  assert.equal(result.newestTs, null);
});

test("evaluatePauseTelemetryStaleness reports fresh (not stale) for a just-recorded dispatch", async () => {
  const repo = await tmpRepo("pt-stale-fresh-");
  await recordDispatchOutcome(repo, { agentRole: "a", outcome: "completed" });
  const result = await evaluatePauseTelemetryStaleness(repo, null);
  assert.equal(result.stale, false);
  assert.ok(result.newestTs);
});

test("evaluatePauseTelemetryStaleness reports stale when the newest record predates the threshold", async () => {
  const repo = await tmpRepo("pt-stale-old-");
  await recordDispatchOutcome(repo, {
    agentRole: "a",
    outcome: "completed",
    ts: "2026-06-01T00:00:00.000Z"
  });
  const now = Date.parse("2026-08-01T00:00:00.000Z");
  const result = await evaluatePauseTelemetryStaleness(repo, null, now);
  assert.equal(result.stale, true);
  assert.equal(result.newestTs, "2026-06-01T00:00:00.000Z");
  assert.equal(result.thresholdDays, 7);
});

test("evaluatePauseTelemetryStaleness picks the newest ts across mixed record kinds", async () => {
  const repo = await tmpRepo("pt-stale-newest-");
  await recordDispatchOutcome(repo, {
    agentRole: "a",
    outcome: "completed",
    ts: "2026-07-01T00:00:00.000Z"
  });
  await recordPauseEvent(repo, {
    agentRole: "a",
    kind: "pause",
    detection: "no_artifact",
    ts: "2026-07-15T00:00:00.000Z"
  });
  const now = Date.parse("2026-07-16T00:00:00.000Z");
  const result = await evaluatePauseTelemetryStaleness(repo, null, now);
  assert.equal(result.newestTs, "2026-07-15T00:00:00.000Z");
  assert.equal(result.stale, false);
});

test("evaluatePauseTelemetryStaleness honors a configured staleAfterDays override", async () => {
  const repo = await tmpRepo("pt-stale-override-");
  await recordDispatchOutcome(repo, {
    agentRole: "a",
    outcome: "completed",
    ts: "2026-07-30T00:00:00.000Z"
  });
  const now = Date.parse("2026-08-01T00:00:00.000Z"); // 2 days old
  const strict = await evaluatePauseTelemetryStaleness(
    repo,
    { loop: { pauseTelemetryStaleAfterDays: 1 } },
    now
  );
  assert.equal(strict.stale, true);
  const lenient = await evaluatePauseTelemetryStaleness(
    repo,
    { loop: { pauseTelemetryStaleAfterDays: 3 } },
    now
  );
  assert.equal(lenient.stale, false);
});
