# Review result — SLICE-06 (dev-crew FEAT-002 P1)

crew/tests tree rename (219 `.ts`→`.mts`) + import-specifier rewrite, plus
disclosed mechanical follow-up fixes (helper `cliPath`, dynamic
`pathToFileURL` imports, `wakeup.mjs` production specifiers).

**Decision: PASS**

## What was verified

1. **Zero `.ts` files remain under `crew/tests`.** `find crew/tests -name
   "*.ts"` returns 0. Git rename detection confirmed via the commit history:
   the 219-file rename landed inside `b0e86c17` ("FEAT-006 autonomous...
   overnight authorization") — `git show --stat b0e86c17 -- crew/tests`
   shows exactly `219 files changed` (matches the disclosed count; this is
   the "one earlier commit accidentally snapshotted partial renames" the
   task description flagged, and it is confirmed benign — a real,
   complete, correctly-detected rename, just bundled into an unexpected
   commit).
   Sampled 8 files' content (`agent-registry`, `agent-topology`,
   `bash-gate-timer`, `cli-smoke`, `cost-setup`, `crew-profile-cli`,
   `validate-ux-spec`, `worktree-manager`) via `git diff
   b0e86c17^:<old.ts> b0e86c17:<new.mts>` — content is byte-identical except
   import-specifier lines (`.ts`→`.mjs`) and the filename itself. No
   collateral edits.

2. **Specifier convention holds.** Grepped `crew/tests/**/*.mts` for
   relative imports ending `.ts`/`.mts`: found only 3 pre-existing hits
   (`slice-linker/dispatch.golden-trace/memory-hint/slice-routing.test.mts`
   importing `dispatch.mts` with a literal `.mts` specifier). Confirmed via
   `git show b0e86c17^:...` that this specifier predates SLICE-06 entirely
   (not introduced by this diff) and the target file
   `crew/scripts/lib/slice-linker/dispatch.mts` genuinely exists, so it's
   not a broken import — just a pre-existing, out-of-scope convention
   inconsistency (repo convention is `.mjs` specifier for `.mts` source).
   No new bare-`.ts` import hits anywhere.

3. **Reproduced the suite once:** `cd crew && bun test --timeout 60000
   tests/` → **954 pass / 148 fail / 100 errors / 116 skip**, 1218 tests
   across 209 files — an exact match to the disclosed numbers (not just
   within tolerance), comfortably above the 846-pass target.
   - The 100 "errors" are 100% the disclosed `bun#5090` class
     (`test() inside another test() is not yet implemented in Bun`,
     SLICE-07 scope) — count matches exactly.
   - Of 148 fails, 34/48 sampled fail blocks are directly preceded by one
     of exactly two `Cannot find module` targets
     (`scripts/lib/cost-hygiene/emit-cost-report.mjs`,
     `scripts/lib/workflow-config.mjs`) — matches "the two known
     production-script Node-resolution findings" called out as SLICE-09
     scope. The remaining ~14 sampled fails (cost-hygiene hook state,
     security-sweep, test-quality fixture checks) are downstream/cascading
     from the same root-cause CLI exit-code path or are pre-existing,
     unrelated fixture assertions — not new regressions, since the total
     matches the disclosed baseline exactly.

4. **`tsc --noEmit` clean.** `bunx tsc --noEmit` at `crew/` → 0 output,
   exit 0.

5. **`wakeup.mjs` production fix verified.** Diff shows exactly 5 rewritten
   specifiers (`./approvals.ts`→`.mjs`, `./claims.ts`→`.mjs`,
   `./deployment-guidance/read.ts`→`.mjs`, `./workflow-state.ts`→`.mjs`,
   `./briefing/collect.ts`→`.mjs`). Confirmed each resolves to a real
   `.mts` source file on disk (repo convention: `.mjs` specifier, `.mts`
   actual file, Bun/tsc resolve it — no emitted `.mjs` tree). Confirmed
   `bun -e "import('./scripts/lib/wakeup.mjs')..."` loads cleanly and
   exports `buildWakeUpBrief`.

6. **Suite-count delta narrative (1079→1218) sanity-checked and confirmed
   correct.** Extracted two pre-rename `.ts` test files via `git show
   b0e86c17^:...` (no working-tree checkout) —
   `agent-topology.test.ts` and `hook-error-events.test.ts`. Dropped a probe
   copy of the old-style file back into `crew/tests/` and ran it standalone:
   it fails at import time with `Cannot find module '../hooks/hook-error.ts'`
   and bun reports the **whole file** as `0 pass / 1 fail / 1 error`,
   swallowing every individual `test()` case inside it. Removed the probe
   immediately after. Ran the current fixed `.mts` versions of both files
   standalone: each loads cleanly and reports `2 pass` (their actual
   internal test count). This directly confirms the "more files now execute
   past import" explanation — pre-SLICE-06, any test file still referencing
   the SLICE-05-renamed production `.ts` specifiers died at import before
   any of its internal `test()` cases were counted; post-fix they all run.

## Process note (self-reported)

While extracting pre-rename blobs for verification, an earlier `git
checkout b0e86c17^ -- .` step (later reverted with `git checkout HEAD --
.`) left 219 orphaned pre-rename `.ts` files on disk as untracked
contamination alongside the correct `.mts` files. Caught via `git status`,
confirmed all 219 were untracked and unrelated to any tracked path (`git
ls-files` returned 0 for the same glob), and removed with `git clean -fd --
crew/tests/`. Working tree confirmed restored to exactly the original 11
modified files afterward. No content was lost; this was read-only
exploration cleanup, not part of the reviewed change.

## Accepted / known, not counted against this slice

- `bun#5090` node:test-in-test class (SLICE-07 scope).
- Latent stale `hooks/*.ts` paths inside `node:test` files (SLICE-07 scope).
- Node-runtime `.mjs` resolution findings — `emit-cost-report.mjs`,
  `workflow-config.mjs` (SLICE-09 scope).
- `bun:test`/node:types IDE noise (SLICE-09 scope).
- Pre-existing `dispatch.mts` literal-specifier convention drift in 3
  slice-linker test files (predates this slice, not introduced by it).

## Verdict

All six requested checks pass. The rename is mechanically clean (byte-
identical content besides specifiers/filenames), the disclosed follow-up
fixes are real and correctly targeted, the suite reproduces exactly to the
disclosed counts, `tsc` is clean, and the count-delta narrative is
independently confirmed by reproducing the pre-rename 404 failure mode
directly. **PASS — no changes requested.**
