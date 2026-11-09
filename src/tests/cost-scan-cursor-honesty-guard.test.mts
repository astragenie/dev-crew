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
// Follow-up correction (same slice, review B / verifier round 2): holding
// the cursor on EVERY refusal reason (the first-pass fix this suite
// originally pinned) was itself over-broad -- it contradicts FEAT-268's
// "two consecutive scans must advance" contract for the two reasons that
// have nothing in an empty/duplicate window to lose
// (`sessions_scanned_zero`, `duplicate run_id`; see
// cost-scan-window-regression.test.mts). The cursor-hold decision is now
// reason-gated via `preserveCursor` on the guard's refusal result
// (crew/scripts/lib/cost-hygiene/cost-report-guard.mts). This suite is
// scoped to `window_too_wide`, the one reason that still preserves.
//
// `window_too_wide` (the guard reason reviewer B and the verifier both
// reproduced) only fires once `sessionsScanned > 0`, which requires a real
// staged session transcript to trigger through the full stack. Rather than
// staging one, this suite stubs `costSliceHandler` at its module boundary
// (`crew/scripts/lib/cost-hygiene/cost-slice-handler.mts`, imported by
// crew-bridge.mts under its repo-convention `.mjs` specifier) via
// `bun:test`'s `mock.module` — the lowest seam that still exercises the
// real `tryWriteCostReport` cursor-gate logic end to end.
//
// Serial-run pollution (post-merge audit fix): `mock.module` registers a
// process-wide override on this Bun version (1.3.14); it is NOT file-scoped
// — that only looked true under `bun test --parallel`, where Bun isolates
// each test file in its own worker, hiding the shared-process effect. Under
// a serial run (CI, or `bun test src/tests/` without `--parallel`) two
// separate leaks were confirmed by bisection:
//
// 1. `crew-bridge.mjs` (the module under test, imported here via its
//    repo-convention dynamic `await import(...)`) is a PROCESS-WIDE
//    singleton: Bun evaluates its module body exactly once, and its
//    internal static `import { costSliceHandler } from
//    "cost-slice-handler.mjs"` binds, once and permanently, to whichever
//    `costSliceHandler` was registered at THAT evaluation moment — a later
//    `mock.module` call for the same path cannot retroactively rebind an
//    already-evaluated static importer (verified empirically: instrumenting
//    crew-bridge.mts showed its module body runs exactly once per Module
//    Record, and a later, successful mock restore had zero effect on calls
//    already routed through that first-evaluated Record). Any sibling file
//    that reaches the real, non-busted `crew-bridge.mjs` via a plain static
//    top-level import (cost-scan-window-regression.test.mts,
//    cost-project-slugify.test.mts) shares that SAME singleton — if this
//    file's mock happened to be active when THAT shared singleton was first
//    evaluated (a real, confirmed race in a serial run), every later caller
//    through it, including the sibling file's own calls, keeps getting this
//    file's fake forever. The fix: this file imports `crew-bridge.mjs`
//    through a query-string-busted specifier (`?honesty-guard-isolated=...`)
//    so it gets its OWN private Module Record, and never touches/evaluates
//    the shared, non-busted singleton that other files depend on.
//
// 2. Restoring the mock via `mock.module(costSliceHandlerPath, () =>
//    realModule)`, passing back the EXACT namespace object captured by an
//    `await import(...)` taken before any mocking, is silently a no-op on
//    this Bun version — subsequent plain imports keep getting the most
//    recent FAKE factory's result, not the "restored" real one (verified
//    empirically). A spread COPY of that namespace object (`{ ...realModule
//    }`, a structurally-identical but reference-DISTINCT plain object)
//    does not trigger whatever internal check skips the raw-reference case,
//    and genuinely restores the real `costSliceHandler` for subsequent
//    resolutions. The snapshot is taken once, before the mock is ever
//    registered, and reused for the restore in `afterAll`.
//
// Combining both: this file's own `crew-bridge.mjs` copy is isolated via
// cache-busting (so its tests see the fake without ever touching the
// shared singleton), and `cost-slice-handler.mjs`'s shared registry entry
// is correctly restored to a real-behaving spread snapshot in `afterAll` —
// so whichever sibling file first evaluates the shared `crew-bridge.mjs`
// singleton (whenever that happens to occur), it resolves to the real
// `costSliceHandler`, not this file's fake.
//
// A single `mock.module` call is registered once, with its factory closing
// over a mutable `handlerMode` switch the tests flip before each call —
// calling `mock.module` a second time for the SAME path before any test
// body runs was found empirically to lose the first mock entirely, so one
// mock + a shared mutable switch is used instead of two separate
// `mock.module` registrations.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, mock, afterAll } from "bun:test";
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

// Captured BEFORE `mock.module` below replaces the registry entry. A spread
// COPY (not the raw namespace object — see the file-header comment on why
// that distinction matters on this Bun version) is what `afterAll` uses to
// restore the real module.
const realCostSliceHandlerModule = await import(costSliceHandlerPath);
const realCostSliceHandlerSnapshot = { ...realCostSliceHandlerModule };

mock.module(costSliceHandlerPath, () => ({
  costSliceHandler: async () =>
    handlerMode === "refuse"
      ? // `preserveCursor: true` matches the real
        // evaluateCostReportGuard's PRESERVE_CURSOR_BY_REASON for
        // `window_too_wide` specifically (SLICE-50 review B / verifier
        // follow-up): that reason loses real unreported session activity if
        // the cursor advances past it, so it is the one reason that still
        // holds. `sessions_scanned_zero` / `duplicate run_id` do not (see
        // cost-scan-window-regression.test.mts) — this suite is scoped to
        // the window_too_wide case only.
        { written: false, reason: "window_too_wide", preserveCursor: true }
      : { path: "/irrelevant/fake-report.md", kind: "cost-report-slice" }
}));

afterAll(() => {
  mock.module(costSliceHandlerPath, () => realCostSliceHandlerSnapshot);
});

// Cache-busted so this file gets its OWN private `crew-bridge.mjs` Module
// Record instead of sharing the process-wide singleton that
// cost-scan-window-regression.test.mts / cost-project-slugify.test.mts
// import via a plain static specifier — see the file-header comment, leak
// #1.
const { tryWriteCostReport } = await import(
  `../scripts/lib/slice-linker/crew-bridge.mjs?honesty-guard-isolated=${Date.now()}`
);
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
