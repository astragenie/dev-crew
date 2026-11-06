// SLICE-163: dedicated regression suite for the FEAT-268 cost-scan window
// fix (root cause: docs/research/2026-08-02-cost-window-freeze-root-cause-spike.md).
// SLICE-162 shipped the fix + unit-level coverage of `resolveCostScanWindow`
// in cost-scan-cursor.test.mts. This file adds the coverage that spike
// flagged as still missing:
//
//  1. AC-1 at the INTEGRATION level: `tryWriteCostReport` invoked twice in a
//     row, proving the window-advance fix end-to-end rather than only at
//     the `resolveCostScanWindow` unit boundary. SLICE-11 (P2
//     seam-elimination) removed `tryWriteCostReport`'s `crew` CLI subprocess
//     hop entirely, so this test was rewritten off the old `$HERO_CREW_PATH`
//     fake-CLI-plus-argv-inspection seam and now asserts on the real
//     `costSliceHandler`/`computeSessionCost` direct-import return value
//     (`result.cost.window.{start,end}`, echoed back by
//     `session-cost.mts`'s `assembleCostResult`) instead of a fake
//     subprocess's argv or a fabricated report file. `config.loop.costProject`
//     is set so cost mode resolves to "scoped" (a single, fast, likely-empty
//     directory scan) rather than "aggregate" (a real, slow scan of
//     `~/.claude/projects/` on whatever machine runs the test).
//  2. The `resolveCostScanWindow` falsy-sliceId defensive branch (LOW nit
//     from the SLICE-162 review).
//  3. AC-4: memory-snapshot.mts's dedup key (resolveCostReportUsd /
//     sliceKeyOf, :124/:157) is an EXACT string match, never a fuzzy or
//     tolerance-band match -- locks the "do NOT loosen the dedup
//     fingerprint" constraint against future regression.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readCostScanCursor,
  writeCostScanCursor,
  resolveCostScanWindow
} from "../scripts/lib/slice-linker/cost-scan-cursor.mjs";
import { tryWriteCostReport } from "../scripts/lib/slice-linker/crew-bridge.mjs";
import { loadCostReportUSDValues } from "../scripts/lib/memory-snapshot.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

async function seedWorkflowState(repo: string, startedAt: string): Promise<void> {
  const dir = path.join(repo, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify({ currentRun: { startedAt } })
  );
}

const STALE_STARTED_AT = "2026-07-03T10:50:26.134Z";

// ---------------------------------------------------------------------------
// AC-1, integration level: real tryWriteCostReport, direct-import path
// ---------------------------------------------------------------------------

test("AC-1 integration: two consecutive tryWriteCostReport calls for the same slice in one session advance the window instead of freezing it", async () => {
  const repo = await tmpRepo("csw-int-repo-");
  await seedWorkflowState(repo, STALE_STARTED_AT);
  const config = { loop: { costProject: "csw-int-fake-project" } };
  const sliceId = "SLICE-CSW-INT";

  const firstResult: any = await tryWriteCostReport(repo, { sliceId }, config);
  assert.ok(!firstResult?.error, `first call must not error: ${JSON.stringify(firstResult)}`);

  const secondResult: any = await tryWriteCostReport(repo, { sliceId }, config);
  assert.ok(!secondResult?.error, `second call must not error: ${JSON.stringify(secondResult)}`);

  const firstStartedAt = firstResult.cost?.window?.start;
  const firstCompletedAt = firstResult.cost?.window?.end;
  const secondStartedAt = secondResult.cost?.window?.start;
  const secondCompletedAt = secondResult.cost?.window?.end;

  assert.equal(
    firstStartedAt,
    STALE_STARTED_AT,
    "first-ever scan for this slice has no cursor yet, so it falls back to currentRun.startedAt"
  );
  assert.ok(firstCompletedAt, "first call must resolve a window end");

  // The exact regression this slice exists to pin: the SECOND invocation's
  // Window Start must be the FIRST invocation's Window End -- not the
  // still-frozen currentRun value. workflow-state.json is never rewritten
  // between the two calls here, which is exactly the "repeated
  // same-session scan" failure mode from the root-cause spike.
  assert.equal(
    secondStartedAt,
    firstCompletedAt,
    "second scan's Window Start must advance to the first scan's Window End"
  );
  assert.notEqual(
    secondStartedAt,
    STALE_STARTED_AT,
    "second scan must NOT re-read the frozen currentRun.startedAt"
  );
  assert.ok(secondCompletedAt, "second call must resolve a window end");
  assert.notEqual(
    secondCompletedAt,
    firstCompletedAt,
    "the window must keep advancing, not repeat the same span"
  );

  // This fixture's `costProject` points at a project directory that never
  // has any real session files, so both scans see `sessionsScanned === 0`.
  // FEAT-025 AC-1's honesty guard (added after this test was first written
  // -- SLICE-50, cost-report-guard.mts) now correctly REFUSES to write a
  // cost-report artifact for an empty scan rather than writing a
  // zero-session report as before; the original "must carry a written
  // report path" assertions here are obsoleted by that contract, not by a
  // bug in this fix. The refusal still reports what it measured (`.cost`,
  // asserted on above) and -- because `sessions_scanned_zero` has nothing
  // in an empty window to lose -- still advances the per-slice scan cursor,
  // which is the actual regression this test exists to pin.
  assert.equal(firstResult.written, false, "empty-session scan must be refused, not written");
  assert.equal(firstResult.reason, "sessions_scanned_zero");
  assert.equal(secondResult.written, false, "empty-session scan must be refused, not written");
  assert.equal(secondResult.reason, "sessions_scanned_zero");

  // The persisted cursor must reflect the SECOND call's completedAt --
  // ready to hand the next (third) invocation an even later window -- even
  // though both calls were refused for honesty reasons.
  const cursor = await readCostScanCursor(repo, sliceId);
  assert.ok(cursor, "cursor should exist after two scans");
  assert.equal(cursor!.lastWindowEnd, secondCompletedAt);
});

// ---------------------------------------------------------------------------
// resolveCostScanWindow: falsy-sliceId defensive branch (SLICE-162 review nit)
// ---------------------------------------------------------------------------

test("resolveCostScanWindow: falsy sliceId (null/undefined/empty) always falls back to currentRun.startedAt and never consults a persisted cursor", async () => {
  const repo = await tmpRepo("csw-falsy-slice-");
  // A cursor exists for a DIFFERENT, non-empty sliceId -- proves the falsy
  // branch short-circuits before any cursor lookup, rather than coincidentally
  // matching nothing.
  await writeCostScanCursor(repo, "SLICE-REAL", "2026-08-01T00:00:00.000Z");
  const workflowState = { currentRun: { startedAt: "2026-07-01T00:00:00.000Z" } };
  const now = () => "2026-08-02T00:00:00.000Z";

  const withNull = await resolveCostScanWindow(repo, null, workflowState, now);
  assert.equal(withNull.startedAt, "2026-07-01T00:00:00.000Z");
  assert.equal(withNull.completedAt, "2026-08-02T00:00:00.000Z");

  const withUndefined = await resolveCostScanWindow(repo, undefined, workflowState, now);
  assert.equal(withUndefined.startedAt, "2026-07-01T00:00:00.000Z");

  const withEmptyString = await resolveCostScanWindow(repo, "", workflowState, now);
  assert.equal(withEmptyString.startedAt, "2026-07-01T00:00:00.000Z");
});

test("resolveCostScanWindow: falsy sliceId with no currentRun.startedAt returns null startedAt (no crash, no fabricated window)", async () => {
  const repo = await tmpRepo("csw-falsy-slice-null-");
  const window = await resolveCostScanWindow(repo, null, null, () => "2026-08-02T00:00:00.000Z");
  assert.equal(window.startedAt, null);
  assert.equal(window.completedAt, "2026-08-02T00:00:00.000Z");
});

// ---------------------------------------------------------------------------
// AC-4: resolveCostReportUsd / sliceKeyOf dedup key is EXACT match, never a
// tolerance-band or fuzzy match (locks the "do NOT loosen the dedup
// fingerprint" constraint from the SLICE-163 objective).
// ---------------------------------------------------------------------------

async function writeCostReportFile(
  repo: string,
  timestampPrefix: string,
  fm: Record<string, string | number>
): Promise<void> {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "cost");
  await fs.mkdir(dir, { recursive: true });
  const filename = `${timestampPrefix}-cost-report-${Math.random().toString(36).slice(2)}.md`;
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("---", "", "# Cost Report", "");
  await fs.writeFile(path.join(dir, filename), lines.join("\n"));
}

test("AC-4: slice-id dedup key is an EXACT string match -- look-alike but distinct slice ids never collapse together", async () => {
  const repo = await tmpRepo("csw-ac4-exact-slice-");

  // Two reports with the IDENTICAL slice id -- must dedupe to exactly one
  // (never averaged: 5.0 and 500.0 differ 100x, so any blending would be
  // immediately visible).
  await writeCostReportFile(repo, "20260801T000004Z", {
    kind: "cost-report",
    slice: "SLICE-99",
    usd: 5.0
  });
  await writeCostReportFile(repo, "20260801T000003Z", {
    kind: "cost-report",
    slice: "SLICE-99",
    usd: 500.0
  });
  // Look-alike but textually DISTINCT slice ids -- an exact-match key must
  // keep every one of these as its own entry; a fuzzy/prefix/tolerance-band
  // key would wrongly fold some of them into SLICE-99's bucket.
  await writeCostReportFile(repo, "20260801T000002Z", {
    kind: "cost-report",
    slice: "SLICE-990",
    usd: 7.0
  });
  await writeCostReportFile(repo, "20260801T000001Z", {
    kind: "cost-report",
    slice: "SLICE-99A",
    usd: 9.0
  });
  await writeCostReportFile(repo, "20260801T000000Z", {
    kind: "cost-report",
    slice: "slice-99",
    usd: 11.0
  }); // case-distinct from SLICE-99

  const values = await loadCostReportUSDValues(repo, 20);

  assert.equal(
    values.filter((v) => v === 5.0 || v === 500.0).length,
    1,
    "identical slice id must dedupe to exactly one value, never both"
  );
  assert.ok(
    values.includes(5.0),
    "the newest SLICE-99 report wins the dedup (file-iteration order)"
  );
  assert.ok(
    !values.includes(500.0),
    "the older SLICE-99 duplicate must be dropped, not blended in"
  );
  assert.ok(values.includes(7.0), "SLICE-990 must count separately from SLICE-99");
  assert.ok(values.includes(9.0), "SLICE-99A must count separately from SLICE-99");
  assert.ok(
    values.includes(11.0),
    "lowercase slice-99 must count separately from SLICE-99 (case-sensitive exact match)"
  );
  assert.equal(
    values.length,
    4,
    "4 distinct dedup keys total: SLICE-99 (deduped from 2), SLICE-990, SLICE-99A, slice-99"
  );
});

test("AC-4: run-title fallback dedup key (run:feature|run_title) is exact match too -- a case-only difference does not collapse", async () => {
  const repo = await tmpRepo("csw-ac4-exact-runtitle-");

  // No `slice:` field on any of these -- forces sliceKeyOf's run:feature|title
  // fallback branch.
  await writeCostReportFile(repo, "20260801T000002Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "slice-163-regression",
    usd: 3.0
  });
  await writeCostReportFile(repo, "20260801T000001Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "slice-163-regression",
    usd: 30.0
  });
  // Case-distinct run_title -- exact string match must NOT collapse this
  // with the identical pair above.
  await writeCostReportFile(repo, "20260801T000000Z", {
    kind: "cost-report",
    feature: "FEAT-268",
    run_title: "Slice-163-Regression",
    usd: 300.0
  });

  const values = await loadCostReportUSDValues(repo, 20);

  assert.equal(
    values.length,
    2,
    "identical run_title dedupes to 1; the case-distinct run_title survives separately"
  );
  assert.ok(values.includes(3.0), "the newest identical-key report wins the dedup");
  assert.ok(
    !values.includes(30.0),
    "the older identical-key duplicate must be dropped, not averaged in"
  );
  assert.ok(values.includes(300.0), "the case-distinct run_title must count as its own key");
});
