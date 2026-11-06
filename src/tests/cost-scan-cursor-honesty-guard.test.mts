// SLICE-50 review B blocker: `tryWriteCostReport` (crew-bridge.mts) used to
// advance the per-slice cost-scan cursor whenever `costSliceHandler`'s
// return carried no `.error` key. Commit 58dcfb62 wired FEAT-025's honesty
// guard (evaluateCostReportGuard, crew/scripts/lib/cost-hygiene/
// cost-report-guard.mts) into costSliceHandler, so it can now REFUSE and
// return `{ written: false, reason }` with no `.error` key at all — making
// the pre-existing `!report?.error` cursor gate silently advance past a
// refused window. Real unreported session activity in that window would
// then be permanently skipped on the next scan.
//
// `window_too_wide` (the guard reason reviewer B and the verifier both
// reproduced) only fires once `sessionsScanned > 0`, which requires a real
// staged session transcript to trigger through the full stack. Rather than
// staging one, this suite stubs `costSliceHandler` at its module boundary
// (`crew/scripts/lib/cost-hygiene/cost-slice-handler.mts`, imported by
// crew-bridge.mts under its repo-convention `.mjs` specifier) via
// `bun:test`'s `mock.module` — the lowest seam that still exercises the
// real `tryWriteCostReport` cursor-gate logic end to end. `mock.module` is
// file-scoped in Bun's test runner (verified empirically: a module mocked
// in one test file is unaffected in sibling files run in the same `bun
// test a b c` invocation), so this does not leak into other suites that
// exercise the real costSliceHandler (e.g. cost-scan-window-regression.test.mts).
//
// A single `mock.module` call is registered once, with its factory closing
// over a mutable `handlerMode` switch the tests flip before each call —
// calling `mock.module` a second time for the SAME path before any test
// body runs (both top-level dynamic imports resolve before bun's test
// runner starts executing test() bodies) was found empirically to lose the
// first mock entirely, so one mock + a shared mutable switch is used
// instead of two separate `mock.module` registrations.
//
// The mock MUST be registered before crew-bridge.mjs's own static import
// chain pulls in the real cost-slice-handler module, so this file uses a
// dynamic `await import(...)` for the functions under test instead of a
// top-level static import.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, mock } from "bun:test";
import assert from "node:assert/strict";

const costSliceHandlerPath = path.join(
  import.meta.dir,
  "..",
  "..",
  "crew",
  "scripts",
  "lib",
  "cost-hygiene",
  "cost-slice-handler.mts"
);

let handlerMode: "refuse" | "succeed" = "refuse";

mock.module(costSliceHandlerPath, () => ({
  costSliceHandler: async () =>
    handlerMode === "refuse"
      ? { written: false, reason: "window_too_wide" }
      : { path: "/irrelevant/fake-report.md", kind: "cost-report-slice" }
}));

const { tryWriteCostReport } = await import("../scripts/lib/slice-linker/crew-bridge.mjs");
const { readCostScanCursor, writeCostScanCursor } = await import(
  "../scripts/lib/slice-linker/cost-scan-cursor.mjs"
);

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// Refusal case: costSliceHandler returns { written: false, reason }, no
// `.error` key. The cursor must NOT advance.
// ---------------------------------------------------------------------------

test("tryWriteCostReport holds the cost-scan cursor when the honesty guard refuses (written: false, no .error)", async () => {
  handlerMode = "refuse";
  const repo = await tmpRepo("csc-honesty-refuse-");
  const sliceId = "SLICE-HONESTY-1";
  // Seed a pre-existing cursor so we can assert it is left untouched, not
  // merely absent (absence could also mean the write path short-circuited
  // for an unrelated reason).
  await writeCostScanCursor(repo, sliceId, "2026-08-01T00:00:00.000Z");

  const result: any = await tryWriteCostReport(repo, { sliceId }, {});

  assert.equal(result.written, false, "refusal must surface written:false to the caller");
  assert.equal(result.reason, "window_too_wide");
  assert.equal(result.error, undefined, "a refusal carries no .error key — the bug this guards");

  const cursor = await readCostScanCursor(repo, sliceId);
  assert.ok(cursor, "cursor must still exist");
  assert.equal(
    cursor!.lastWindowEnd,
    "2026-08-01T00:00:00.000Z",
    "a refusal must hold the cursor at its pre-call value, not advance it to window.completedAt"
  );
});

test("tryWriteCostReport does not create a cursor file on first-ever scan when the honesty guard refuses", async () => {
  handlerMode = "refuse";
  const repo = await tmpRepo("csc-honesty-refuse-first-");
  const sliceId = "SLICE-HONESTY-2";

  const result: any = await tryWriteCostReport(repo, { sliceId }, {});
  assert.equal(result.written, false);

  const cursor = await readCostScanCursor(repo, sliceId);
  assert.equal(
    cursor,
    null,
    "no cursor existed before the refused call, and none must be created by it"
  );
});

// ---------------------------------------------------------------------------
// Success case (regression guard on the fix itself): a successful write —
// no `.error`, and no `written: false` — must still advance the cursor
// exactly as before.
// ---------------------------------------------------------------------------

test("tryWriteCostReport still advances the cost-scan cursor on a successful write (no .error, no written:false)", async () => {
  handlerMode = "succeed";
  const repo = await tmpRepo("csc-honesty-success-");
  const sliceId = "SLICE-HONESTY-3";

  const result: any = await tryWriteCostReport(repo, { sliceId }, {});
  assert.equal(result.error, undefined);
  assert.notEqual(result.written, false);

  const cursor = await readCostScanCursor(repo, sliceId);
  assert.ok(cursor, "a successful write must leave a cursor behind");
});
