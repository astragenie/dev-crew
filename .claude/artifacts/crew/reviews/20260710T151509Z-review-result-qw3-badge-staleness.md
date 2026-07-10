---
decision: approved
reviewer: crew:reviewer (delegated review agent)
branch: fix/qw3
commit: 8a9e4408
scope: src/scripts/lib/blocked-badge-staleness.mts, src/scripts/lib/crew-workflow-reader.mts, src/scripts/lib/slice-linker/complete-slice.mts, src/tests/blocked-badge-staleness.test.mts, src/tests/slice-complete.test.mts
---

# Review: QW3 stale blocked-badge downgrade

## Summary

Reviewed `git diff origin/main...HEAD` (5 files, +323/-7) in worktree
`C:/work/mega/runner-plugin-worktrees/qw3`. The change downgrades a stale
`gates.blocked` badge in crew's `workflow-state.json` to a console warning
(instead of blocking every subsequent feature roll) once it exceeds
`loop.staleBadgeMaxAgeDays` (default 3d). **Decision: approved.**

## Checklist results

1. **Existing test assertions unmodified** — PASS. `git diff` on
   `src/tests/slice-complete.test.mts` shows an additions-only hunk (114
   lines, all `+`); no pre-existing assertion lines were touched.
   `src/tests/blocked-badge-staleness.test.mts` is a new file.

2. **Safety inversion (critical)** — PASS.
   - `applyStaleBlockedBadgePolicy` (`complete-slice.mts:44-58`) only reads
     and conditionally nulls `blockingGates.blocked`; `blockingGates.escalated`
     passes through untouched (`return blockingGates` unchanged object when
     not blocked-stale, and `{ ...blockingGates, blocked: null }` otherwise —
     `escalated` key is spread through as-is). `describeBlockedGate` still
     checks `blockingGates.escalated` first and unconditionally reports it.
     Review/validation gates (`reviewGate`, `validationGate`,
     `testAdequacyGate`) are separate parameters never passed through the
     staleness policy at all.
   - Fail-safe direction verified two ways: `evaluateBlockedBadgeStaleness`
     (`blocked-badge-staleness.mts:33-45`) returns `stale: false` when
     `updatedAt` is null/missing AND when `Date.parse` yields `NaN` (unparseable
     string) — in both cases the badge keeps blocking. Confirmed by the new
     test `"missing or invalid updatedAt is fail-safe not-stale"` and by the
     existing `"fresh blocked badge still blocks the feature roll (unchanged)"`
     integration test, both green.

3. **Timezone/clock** — PASS / no issue. Staleness is a straight `now - Date.parse(updatedAt)` millisecond diff (`blocked-badge-staleness.mts:41-43`), not a calendar-day comparison, so DST transitions don't skew it. `Date.now()` is used as the default `now` parameter in library/runtime code (not a Workflow script under a determinism convention) — consistent with the reviewer's own framing; no banned-API pattern found elsewhere in the module.

4. **Config fallback** — PASS. `resolveStaleBadgeMaxAgeDays` (`blocked-badge-staleness.mts:26-31`) only accepts a value when `typeof raw === "number" && Number.isFinite(raw) && raw > 0`; `0`, negative, non-numeric, or absent all fall back to `DEFAULT_STALE_BADGE_MAX_AGE_DAYS = 3`. Explicitly covered by test `"resolveStaleBadgeMaxAgeDays falls back to default when unset"` (asserts the `0` case specifically) — matches the `marathonCheckpointEvery` precedent (a `0` does not mean "instantly stale").

5. **Threading** — PASS, verified by reading the plumbing, not just trusting the test. `completeSlice` (`complete-slice.mts:651`) resolves `const resolved = cfgIn ?? (await resolveConfig(repoPath))`, i.e. it honors an injected `opts.config` and only reads from disk when none is supplied. `resolved` is passed into `resolveSliceContext(repoPath, sliceFile, workflowState, resolved)` (line 663), which threads it into `applyStaleBlockedBadgePolicy(deriveBlockingGates(workflowState), config, repoPath)` (lines 500-507). The "threshold is configurable" integration test passes `config: baseLoopConfig({ staleBadgeMaxAgeDays: 1 })` straight into `completeSlice`'s `opts.config`, so it is genuinely exercising the injected value, not a fresh disk read.

6. **Untouched consumers** — PASS. `stop-conditions.mts` and `brief.mts` both consume `crewGates.blocked` sourced from `readCrewBlockingGates()` in `crew-workflow-reader.mts:45-52` — a separate, un-modified gate-derivation function (a near-duplicate of `complete-slice.mts`'s private `deriveBlockingGates`). The diff adds only a new `workflowStatePath()` export to that file and does not touch `readCrewBlockingGates`. Grep confirms no other reference to the new staleness module outside `complete-slice.mts` and its test files, so the builder's stated scoping (raw badges still seen by stop-conditions/brief) holds.

7. **Evidence reproduced**:
   - `bun test src/tests/blocked-badge-staleness.test.mts src/tests/slice-complete.test.mts` → 30 pass / 0 fail.
   - `bun test src/tests/ --parallel --timeout 60000` → **2669 pass, 1 skip, 0 fail** across 280 files — matches the claimed count exactly.
   - `bunx tsc --project tsconfig.json --noEmit` → clean (no errors).
   - `bunx tsc --project tsconfig.test.json --noEmit` → clean (no errors).
   - `bunx biome lint` on the 5 touched files → 1 warning (`noExcessiveCognitiveComplexity` on `computeFeatureResult`, complexity 26) + 3 infos (`useLiteralKeys`). Confirmed **pre-existing**: linting `origin/main`'s copy of `complete-slice.mts` in isolation reproduces the identical complexity-26 warning at the same function — this diff does not regress it (the function gained one parameter, `repoPath`, not new branching).
   - `bunx biome format` on the 5 touched files → clean, no diff.

## Minor / non-blocking notes

- `docs/halt-badges.md` was not updated. On inspection, that registry is
  scoped to loop's own `snapshot.*` halt-badge fields emitted by
  `stop-check`/`brief` (per SPEC-003), not to crew's `workflow-state.json`
  `gates.blocked` badge that this change downgrades — so no update is
  required under the CLAUDE.md "new halt-badge" rule. Not a blocker.
- No CHANGELOG entry for this fix. Optional given `dev.stable` scope; call
  out to the operator if a release note is expected before shipping.

## Decision

**approved** — no correctness, safety-inversion, or regression issues found.
Evidence reproduced independently matches the claimed test/typecheck results.
