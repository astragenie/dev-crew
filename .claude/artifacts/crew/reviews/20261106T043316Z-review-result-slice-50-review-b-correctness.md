---
findings: "# SLICE-50 / FEAT-025 review B (correctness) — re-verification, commit 58dcfb62\n\nScope: `git diff 0125f2c6..58dcfb62` touches exactly four files:\n`crew/scripts/lib/cost-hygiene/cost-report-guard.mts` (new),\n`crew/scripts/lib/cost-hygiene/cost-slice-handler.mts`,\n`crew/scripts/lib/cost-hygiene/emit-cost-report.mts`,\n`crew/tests/cost-report-honesty.test.mts`.\n\n## Blocker from the prior review: FIXED\n\nPrior finding: AC-1's refusal contract (`{written:false, reason}` for\nzero-sessions / wide-window / duplicate-run_id, plus `run_id` stamping)\nlived only in `emit-cost-report.mts`'s `maybeEmitCostReport`, which this\nrepo's autonomous loop never calls — the loop calls `costSliceHandler`\n(via `src/scripts/lib/slice-linker/crew-bridge.mts`), which had none of it.\n\nFix verified: `cost-report-guard.mts` (new, 119 lines) extracts\n`evaluateCostReportGuard` — the three guards in order (sessions_scanned_zero\n-> window_too_wide -> duplicate run_id) plus `resolveRunId` — as one shared\nimplementation. Both callers now use it:\n\n- `emit-cost-report.mts`: `emitCostReportInner` calls\n  `evaluateCostReportGuard({... run: run as ..., startedAt: run.startedAt,\n  completedAt, sessionsScanned, usd, allowWideWindow, maxWindowHours})`,\n  returns `{written:false, reason: guard.reason}` on refusal, else uses\n  `guard.runId`. Confirmed the old duplicated `windowHoursBetween` /\n  `resolveRunId` / `findDuplicateRunId` local functions were deleted from\n  this file (diff shows -91/+? net removal, now just imports the shared\n  helper).\n- `cost-slice-handler.mts`: new `buildGuardParams` helper (keeps cognitive\n  complexity under the repo's cap per `AGENTS.md`) resolves guard inputs\n  from `sliceCost.window.{start,end}` (the *actual* resolved scan window —\n  correctly preferred over the raw `startedAt`/raw `completedAt` params,\n  since `completedAt` can be null and gets defaulted internally by\n  `computeSessionCost`). `costSliceHandler` now calls\n  `evaluateCostReportGuard(...)` before `writeArt(...)`, returns\n  `{written:false, reason: guard.reason}` on refusal, and passes\n  `runId: guard.runId` into the written artifact's fields — this is new;\n  the pre-fix `costSliceHandler` never set a `runId` field at all.\n\nNew tests in `crew/tests/cost-report-honesty.test.mts` drive\n`costSliceHandler` directly for all 4 relevant scenarios:\n`sessionsScanned===0` refusal, `window_too_wide` refusal (8-day-old\nfixture session, no `--allow-wide-window`), a normal emit asserting the\nwritten frontmatter `content).toContain(\"run_id:\")`, and a same-run_id\nretry refused as `\"duplicate run_id\"` with the cost-dir file count\nunchanged. All 4 pass.\n\nTest run: `cd crew && bun test tests/pricing.test.mts\ntests/cost-report-honesty.test.mts tests/cost-report-emission.test.mts` →\n**33 pass, 0 fail, 87 expect() calls** (up from 29/0/73 before this fix —\nthe +4 tests, +14 expects are exactly the new `costSliceHandler`-direct\ncases). `cd crew && bunx tsc -p tsconfig.json --noEmit` → rc 0. Root\n`bunx tsc -p tsconfig.test.json --noEmit` → rc 0 (this is the config that\nsweeps `cost-slice-handler.mts` in transitively via `crew-bridge.mts` and\nis where the narrowing issue below would otherwise surface).\n\n## `guard.refused === true` vs bare `if (guard.refused)` — verified real, not a workaround\n\nBoth new call sites use `if (guard.refused === true)` with a comment\nattributing this to `tsconfig.test.json`'s `strict: false` failing to\nnarrow a discriminated union returned from an awaited call under a bare\nboolean-property check.\n\nI reproduced this in isolation rather than taking the comment on faith.\nMinimal repro (`type Result = {refused:false;runId:string} |\n{refused:true;reason:string}`, `async function get(): Promise<Result>`,\nthen `if (guard.refused) { ... } ` followed by `const x: string =\nguard.runId;` after the block):\n\n- Compiled under a strict config (`strict: true`, i.e. matching the root\n  `tsconfig.json` crew/ actually ships under) → **rc 0**, narrows fine.\n- Compiled under `tsconfig.test.json`'s actual settings\n  (`strict: false, strictNullChecks: false, noImplicitAny: false,\n  exactOptionalPropertyTypes: false`) → **rc 1**:\n  `error TS2339: Property 'runId' does not exist on type 'Result'.` — the\n  bare boolean check genuinely fails to narrow when `strictNullChecks` is\n  off.\n- Same repro with `if (guard.refused === true)` under the identical loose\n  config → **rc 0**.\n\nSo this is a real, root-caused TypeScript behavior tied specifically to\n`strictNullChecks: false` (not \"strict\" broadly — `tsconfig.test.json`\nturns that one flag off explicitly), and the explicit-equality form is the\ncorrect, minimal fix for it — not a workaround masking a design problem.\nJudgment: accept as written.\n\n## AC-2 / AC-3 / AC-4 — unaffected, remain correct\n\nThis commit does not touch `pricing.json`, `session-cost.mts`,\n`render-frontmatter.mts`, `decide.mts`, `grade-parser.mts`, or\n`grade-writer.mts` — confirmed via the commit's file list (exactly the\nfour files named above). My prior review's AC-2/AC-3 (pricing honesty,\nverified against `docs/audits/2026-11-05/audit-synthesis.md` §3.7) and\nAC-4 (`<fill title>` rejection, verified non-deadlocking against the\nautonomous close path's YAML renderer) findings stand unchanged.\n\n## Path correction (FEAT-025 body) — still open, still minor\n\n`.claude/artifacts/loop/backlog/in-progress/FEAT-025.md:44` still cites\nthe nonexistent `crew/scripts/lib/cost-advise/decide.mts` (real:\n`crew/scripts/lib/cost-hygiene/decide.mts`); this fix commit didn't touch\nthe FEAT body. `docs/memory.md` has no copy of the stale path (re-checked:\n`grep -n \"cost-advise/decide\" docs/memory.md` → no output), so still no\nmemory fix needed, just a one-line FEAT-body correction whenever that file\nis next touched.\n\n## New finding: cursor-advance-past-refusal in crew-bridge.mts (not a blocker, flagged as a note)\n\n`src/scripts/lib/slice-linker/crew-bridge.mts:264-296`\n(`tryWriteCostReport`): after calling `runCostSliceCall` (which wraps\n`costSliceHandler` in a try/catch and returns `{error: message}` only on a\n*thrown* exception), the cursor-advance gate is:\n\n```\nif (sliceId && !report?.error) {\n  await writeCostScanCursor(repoPath, sliceId, window.completedAt);\n}\n```\n\nA `{written:false, reason:\"window_too_wide\"}` (or `\"sessions_scanned_zero\"`\n/ `\"duplicate run_id\"`) result has no `.error` key, so `!report?.error` is\n`true` for every refusal, not just for a successful write — the cursor\nadvances to `window.completedAt` exactly as if the report had been\nwritten.\n\nPer-reason impact:\n- `duplicate run_id`: harmless/idempotent — a prior successful invocation\n  for the same `run_id` already advanced the cursor to (at least) this\n  point.\n- `sessions_scanned_zero`: benign — nothing happened in that span, so\n  advancing past it loses no data; the alternative (never advancing) would\n  make the window grow on every retry until sessions appear or it trips\n  `window_too_wide`.\n- `window_too_wide`: this is the one that matters. The comment directly\n  above the gate says \"a failed invocation leaves the window untouched so\n  the next attempt retries the same, still-valid span instead of silently\n  skipping it\" — but a wide-window refusal is exactly a case where the\n  span is NOT retried; it's silently skipped, permanently, the next time\n  the loop runs (the persisted cursor in\n  `.claude/artifacts/loop/cost-scan-cursors/<sliceId>.json` now reads past\n  the refused window). The span AC-1 explicitly flagged as too-wide-to-\n  trust for cost accounting is dropped rather than surfaced for an operator\n  to replay with `--allow-wide-window`.\n\nThis bug is pre-existing code (FEAT-268's cursor logic), but it was\n**unreachable** before 58dcfb62 — `costSliceHandler` could never return\n`written:false` at all before this fix, so this gate never saw a refusal\nin practice. The fix under review is what makes it live.\n\n**My call, as asked**: in-scope defect, not a follow-up FEAT. It's a\ndirect, foreseeable consequence of the exact change just reviewed, lives\nin a sibling file of the same cost-reporting flow, and the fix is small —\ngate the cursor advance on `report?.written !== false` (treats every\nrefusal reason the same, simplest/safest), or more narrowly exclude only\n`reason === \"window_too_wide\"` if the `sessions_scanned_zero` auto-retry-\nby-growing-window behavior is wanted on purpose. I would want this fixed\nbefore FEAT-025 is considered closed, but it does not block approval of\n58dcfb62 itself — it's outside the four stated ACs and outside the files\nthis slice touched, and the fix just reviewed is correct and well-tested\non its own terms. Flagging explicitly so it's picked up rather than\nsilently dropped.\n\n## Tests run (this re-verification pass)\n\n- `cd crew && bun test tests/pricing.test.mts tests/cost-report-honesty.test.mts tests/cost-report-emission.test.mts`\n  → 33 pass, 0 fail, 87 expect() calls, rc 0.\n- `cd crew && bunx tsc -p tsconfig.json --noEmit` → rc 0.\n- `bunx tsc -p tsconfig.test.json --noEmit` (root) → rc 0.\n- Isolated TS-narrowing repro (strict vs `tsconfig.test.json`-equivalent\n  loose config) → confirmed the `=== true` fix is necessary and correct,\n  not cosmetic."
decision: approved_with_notes
---
# Review Result: SLICE-50 review B (correctness)

- Created: 2026-11-06T04:33:16.943Z
- Reviewer: B
- Decision: approved_with_notes
- Summary: SLICE-50 / FEAT-025 review B (correctness) — re-verification after commit
58dcfb62 — APPROVED WITH NOTES.

The prior BLOCKER is fixed. 58dcfb62 extracts
`crew/scripts/lib/cost-hygiene/cost-report-guard.mts`
(`evaluateCostReportGuard`: the three AC-1 refusals + run_id resolution in
one call) and wires it into both `emit-cost-report.mts`'s
`maybeEmitCostReport` and `cost-slice-handler.mts`'s `costSliceHandler` —
the latter is what `src/scripts/lib/slice-linker/crew-bridge.mts` actually
calls for this repo's own autonomous-loop slice closes. Four new tests
drive `costSliceHandler` directly (zero sessions, wide window, run_id
stamped, duplicate refusal) and all pass; 33/33 tests green across the
three crew cost-report test files (up from 29); both `crew/tsconfig.json`
and root `tsconfig.test.json` typecheck clean.

The `guard.refused === true` explicit-equality check (instead of a bare
`if (guard.refused)`) is the right fix, not a workaround. I reproduced the
narrowing failure in isolation: under `strictNullChecks: false` (what
`tsconfig.test.json` sets, and which sweeps in `cost-slice-handler.mts`
transitively via `crew-bridge.mts`), a bare boolean-property check on a
`{refused:false;runId}|{refused:true;reason}` union does NOT narrow —
`guard.runId` is a compile error afterward — while `=== true` narrows
correctly under both the strict and loose configs. Confirmed empirically,
not just asserted.

AC-2/AC-3 (pricing honesty) and AC-4 (grade-template-unfilled rejection),
approved in my prior review, are untouched by this commit (it only touches
cost-report-guard.mts, cost-slice-handler.mts, emit-cost-report.mts, and
the one test file) and remain correct. The FEAT-025 body's stale
`crew/scripts/lib/cost-advise/decide.mts` path citation (real path:
`crew/scripts/lib/cost-hygiene/decide.mts`) is still present and still
worth a one-line fix next touch; `docs/memory.md` does not repeat it, so
no memory fix is needed.

One new, real finding, raised as a note rather than a second blocker: in
`src/scripts/lib/slice-linker/crew-bridge.mts`'s `tryWriteCostReport`
(line 294), the per-slice scan cursor advances whenever
`!report?.error` — and a `{written:false, reason}` refusal has no `.error`
key, so the cursor advances past a refused window exactly as if the report
had been written. For `duplicate run_id` this is harmless (idempotent —
the matching prior write already advanced the cursor correctly). For
`sessions_scanned_zero` it's benign (nothing happened in that span, so
there is nothing to lose by moving past it). For `window_too_wide` it is
a real regression against the comment two lines above it ("a failed
invocation leaves the window untouched so the next attempt retries...
instead of silently skipping it") — the one case AC-1 built specifically
to flag a suspect span for operator attention now gets silently and
permanently skipped by the cursor instead. This is newly *reachable* only
because of the fix just reviewed (before 58dcfb62, `costSliceHandler`
could never return `written:false` at all, so this line never saw a
refusal). My call: this is an in-scope defect, not a follow-up FEAT — it's
a direct, foreseeable side effect of the exact change under review, in a
sibling file of the same cost-reporting flow, and the fix is small
(gate the cursor advance on `report?.written !== false`, or narrowly on
`report?.reason !== "window_too_wide"` if `sessions_scanned_zero`'s
auto-retry-by-growing-window behavior is wanted deliberately). I'd want it
fixed before calling FEAT-025 closed, but I'm not blocking THIS review on
it since it sits outside the four stated ACs and outside the files this
slice touched — approving with that note so it gets picked up explicitly
rather than silently dropped.
- Evidence Checked: -
- Files Reviewed: -
- Test Adequacy: crew: bun test tests/pricing.test.mts tests/cost-report-honesty.test.mts tests/cost-report-emission.test.mts -> 33 pass/0 fail (up from 29); crew tsc -p tsconfig.json --noEmit -> clean; root tsc -p tsconfig.test.json --noEmit -> clean; isolated TS-narrowing repro confirmed guard.refused===true is required under strictNullChecks:false
- Risks: -
- Required Follow-up: -

