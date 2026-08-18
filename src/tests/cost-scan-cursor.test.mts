// Tests for SLICE-162 / FEAT-268: per-slice cost-scan cursor + session id
// stamp. Covers the root-cause fix from
// docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md — a
// per-slice cost-scan window that survives close retries and skipped
// starts, independent of crew's shared `currentRun.startedAt`.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readCostScanCursor,
  writeCostScanCursor,
  resolveCostScanWindow,
  resolveCostReportSessionId
} from "../scripts/lib/slice-linker/cost-scan-cursor.mjs";
import {
  collectCostReportPaths,
  stampCostReportSessionId
} from "../scripts/lib/slice-linker/crew-bridge.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// --- readCostScanCursor / writeCostScanCursor round-trip ---

test("writeCostScanCursor + readCostScanCursor round-trips lastWindowEnd", async () => {
  const repo = await tmpRepo("csc-roundtrip-");
  await writeCostScanCursor(repo, "SLICE-162", "2026-08-01T00:00:00.000Z");
  const cursor = await readCostScanCursor(repo, "SLICE-162");
  assert.ok(cursor, "cursor should be readable after write");
  assert.equal(cursor!.lastWindowEnd, "2026-08-01T00:00:00.000Z");
  assert.equal(cursor!.sliceId, "SLICE-162");
});

test("readCostScanCursor returns null when no cursor file exists", async () => {
  const repo = await tmpRepo("csc-missing-");
  const cursor = await readCostScanCursor(repo, "SLICE-999");
  assert.equal(cursor, null);
});

test("readCostScanCursor returns null for an invalid sliceId instead of throwing", async () => {
  const repo = await tmpRepo("csc-invalid-id-");
  const cursor = await readCostScanCursor(repo, "../../etc/passwd");
  assert.equal(cursor, null);
});

// --- resolveCostScanWindow ---

test("resolveCostScanWindow falls back to currentRun.startedAt when no cursor exists yet", async () => {
  const repo = await tmpRepo("csc-fallback-");
  const workflowState = { currentRun: { startedAt: "2026-07-03T10:50:26.134Z" } };
  const window = await resolveCostScanWindow(
    repo,
    "SLICE-153",
    workflowState,
    () => "2026-07-10T12:18:30.000Z"
  );
  assert.equal(window.startedAt, "2026-07-03T10:50:26.134Z");
  assert.equal(window.completedAt, "2026-07-10T12:18:30.000Z");
});

test("resolveCostScanWindow returns null startedAt when neither cursor nor currentRun.startedAt exist", async () => {
  const repo = await tmpRepo("csc-nofallback-");
  const window = await resolveCostScanWindow(
    repo,
    "SLICE-1",
    null,
    () => "2026-08-02T00:00:00.000Z"
  );
  assert.equal(window.startedAt, null);
  assert.equal(window.completedAt, "2026-08-02T00:00:00.000Z");
});

test("resolveCostScanWindow prefers the persisted cursor over currentRun.startedAt", async () => {
  const repo = await tmpRepo("csc-prefer-cursor-");
  await writeCostScanCursor(repo, "SLICE-153", "2026-07-10T12:18:29.544Z");
  const workflowState = { currentRun: { startedAt: "2026-07-03T10:50:26.134Z" } };
  const window = await resolveCostScanWindow(
    repo,
    "SLICE-153",
    workflowState,
    () => "2026-07-10T12:22:02.409Z"
  );
  assert.equal(window.startedAt, "2026-07-10T12:18:29.544Z");
});

// AC-1: this is the exact reproduced bug — five reports for the same slice
// within a ~4-minute span all carried the same frozen Window Start because
// currentRun.startedAt never rotated between them. With the cursor, each
// invocation's startedAt should be the PREVIOUS invocation's completedAt.
test("AC-1: two consecutive invocations for the same slice advance the window even though currentRun never rotates", async () => {
  const repo = await tmpRepo("csc-ac1-");
  const staleWorkflowState = { currentRun: { startedAt: "2026-07-03T10:50:26.134Z" } };

  const first = await resolveCostScanWindow(
    repo,
    "SLICE-153",
    staleWorkflowState,
    () => "2026-07-10T12:18:30.000Z"
  );
  assert.equal(
    first.startedAt,
    "2026-07-03T10:50:26.134Z",
    "first scan has no cursor yet, uses currentRun"
  );
  await writeCostScanCursor(repo, "SLICE-153", first.completedAt);

  const second = await resolveCostScanWindow(
    repo,
    "SLICE-153",
    staleWorkflowState, // same frozen currentRun — proves independence
    () => "2026-07-10T12:22:02.409Z"
  );
  assert.equal(
    second.startedAt,
    first.completedAt,
    "second scan's Window Start must be the first scan's Window End"
  );
  assert.notEqual(
    second.startedAt,
    staleWorkflowState.currentRun.startedAt,
    "second scan must NOT re-read the frozen currentRun.startedAt"
  );
});

// --- resolveCostReportSessionId ---

test("resolveCostReportSessionId prefers CLAUDE_SESSION_ID over the pinned currentRun.sessionId", () => {
  const saved = process.env.CLAUDE_SESSION_ID;
  process.env.CLAUDE_SESSION_ID = "session-now";
  try {
    const id = resolveCostReportSessionId({ currentRun: { sessionId: "session-at-start" } });
    assert.equal(id, "session-now");
  } finally {
    if (saved === undefined) delete process.env.CLAUDE_SESSION_ID;
    else process.env.CLAUDE_SESSION_ID = saved;
  }
});

test("resolveCostReportSessionId falls back to currentRun.sessionId when CLAUDE_SESSION_ID is unset", () => {
  const saved = process.env.CLAUDE_SESSION_ID;
  delete process.env.CLAUDE_SESSION_ID;
  try {
    const id = resolveCostReportSessionId({ currentRun: { sessionId: "session-at-start" } });
    assert.equal(id, "session-at-start");
  } finally {
    if (saved !== undefined) process.env.CLAUDE_SESSION_ID = saved;
  }
});

test("resolveCostReportSessionId returns null when neither source is available", () => {
  const saved = process.env.CLAUDE_SESSION_ID;
  delete process.env.CLAUDE_SESSION_ID;
  try {
    assert.equal(resolveCostReportSessionId(null), null);
    assert.equal(resolveCostReportSessionId({ currentRun: {} }), null);
  } finally {
    if (saved !== undefined) process.env.CLAUDE_SESSION_ID = saved;
  }
});

// --- collectCostReportPaths ---

test("collectCostReportPaths reads a plain slice-report return shape", () => {
  const paths = collectCostReportPaths({ path: "/repo/report.md", kind: "cost-report-slice" });
  assert.deepEqual(paths, ["/repo/report.md"]);
});

test("collectCostReportPaths reads both slice + aggregate paths when present", () => {
  const paths = collectCostReportPaths({
    slice: { path: "/repo/slice-report.md" },
    aggregate: { path: "/repo/aggregate-report.md" }
  });
  assert.deepEqual(paths, ["/repo/slice-report.md", "/repo/aggregate-report.md"]);
});

test("collectCostReportPaths returns empty array for null/skipped/error reports", () => {
  assert.deepEqual(collectCostReportPaths(null), []);
  assert.deepEqual(collectCostReportPaths({ skipped: "hero-crew CLI not found" }), []);
  assert.deepEqual(collectCostReportPaths({ error: "boom" }), []);
});

// --- stampCostReportSessionId ---

test("stampCostReportSessionId adds session_id without disturbing existing dedup fields", async () => {
  const repo = await tmpRepo("csc-stamp-");
  const reportPath = path.join(repo, "report.md");
  await fs.writeFile(
    reportPath,
    [
      "---",
      "kind: cost-report",
      "feature: FEAT-268",
      "slice: SLICE-162",
      'run_title: "test run"',
      "usd: 3.5",
      "total_tokens: 12345",
      "created_at: 2026-08-02T00:00:00.000Z",
      "---",
      "",
      "# Cost Report",
      ""
    ].join("\n")
  );
  await stampCostReportSessionId({ path: reportPath }, "session-abc-123");
  const raw = await fs.readFile(reportPath, "utf8");
  const { frontmatter } = parseFrontmatter(raw);
  assert.equal(frontmatter.session_id, "session-abc-123");
  // AC-4: dedup-relevant fields must survive the patch untouched.
  assert.equal(frontmatter.slice, "SLICE-162");
  assert.equal(frontmatter.usd, 3.5);
  assert.equal(frontmatter.total_tokens, 12345);
});

test("stampCostReportSessionId is a no-op when sessionId is null", async () => {
  const repo = await tmpRepo("csc-stamp-noop-");
  const reportPath = path.join(repo, "report.md");
  const original = "---\nkind: cost-report\nusd: 1\n---\n\nbody\n";
  await fs.writeFile(reportPath, original);
  await stampCostReportSessionId({ path: reportPath }, null);
  const raw = await fs.readFile(reportPath, "utf8");
  assert.equal(raw, original);
});

test("stampCostReportSessionId is a no-op when the report carries no path", async () => {
  // Should not throw even though there is nothing to read/write.
  await stampCostReportSessionId({ skipped: "hero-crew CLI not found" }, "session-abc");
  await stampCostReportSessionId(null, "session-abc");
});
