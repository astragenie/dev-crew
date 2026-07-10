---
decision: approved
reviewer: crew:reviewer (delegated review agent)
branch: fix/w1-4
commit: bd01c828
scope: src/scripts/lib/stop-conditions.mts, src/scripts/lib/brief.mts, src/tests/stop-conditions.test.mts, src/tests/brief.test.mts
---

# Review: W1-4 — extend blocked-badge staleness policy to stop-conditions + brief

## Summary

Reviewed `git diff origin/main...HEAD` (commit bd01c828, 4 files, +241/-6)
in worktree `C:/work/mega/runner-plugin-worktrees/w1-4`. This extends PR
#459's QW3 stale-blocked-badge policy (previously applied only in
`complete-slice.mts`) to the two remaining consumers of `gates.blocked`:
the loop-halt logic in `stop-conditions.mts` and the situational report in
`brief.mts`. **Decision: approved**, with one non-blocking follow-up
recommendation on duplication.

## Checklist results

1. **Safety direction (fresh badge still halts, escalation never
   downgraded) — PASS.**
   - Wiring order in `checkStopConditions` (`stop-conditions.mts:490-519`):
     `gatherStopInputs` reads `crewGates` via the existing
     `readCrewBlockingGates` call (no fresh/extra disk read — same
     `Promise.all` at line 456 as before), destructured as `rawCrewGates`.
     `applyStaleBlockedBadgePolicy(rawCrewGates, config, repoPath)` runs
     immediately after and produces the `crewGates` used for everything
     downstream: `appendCrewGateSignals` (line 519), the snapshot's
     `crewBlocked`/`crewEscalated` fields (lines 605-606, via
     `assembleStopResult`'s `p.crewGates`), and `fanoutHaltBadgesFromSnapshot`
     (reads the same `result.snapshot`). There is no path that reads
     `rawCrewGates` after the policy is applied — I grepped all
     `crewGates`/`rawCrewGates` occurrences in the file and every consumer
     after line 507 uses the post-policy binding.
   - `applyStaleBlockedBadgePolicy` (lines 69-81) only ever inspects/nulls
     `crewGates.blocked`. It returns `crewGates` unchanged (same object) when
     there is no blocked badge or the badge isn't stale, and
     `{ ...crewGates, blocked: null }` when stale — `escalated` is carried
     through by the spread in both branches and is never read or written by
     this function.
   - `evaluateBlockedBadgeStaleness` (`blocked-badge-staleness.mts:41-56`,
     unchanged by this diff) fails safe: a badge with no parseable
     `updatedAt` returns `stale: false`, so it keeps blocking exactly as
     before rather than being silently downgraded — confirmed by the "fresh
     blocked badge still halts" and "escalated badge is never downgraded"
     tests (`stop-conditions.test.mts:317-330`, `:391-406`), both of which I
     re-ran and pass (see Evidence).
   - Verified by direct code read, not just tests: a fresh (now-timestamped)
     badge computes `ageDays` ≈ 0, `stale: ageDays >= thresholdDays` is
     false against the default 3-day threshold, so `applyStaleBlockedBadgePolicy`
     returns the gates object with `blocked` intact and
     `appendCrewGateSignals` still pushes the `crew run blocked` reason
     (`stop-conditions.mts:424-428`) when `!autoMode`.

2. **Duplication judgment — recommend a follow-up, not a block.**
   `stop-conditions.mts:69-81`'s `applyStaleBlockedBadgePolicy` is a
   near-verbatim copy of `complete-slice.mts:44-56`'s function of the same
   name (same signature shape, same body: null-check →
   `evaluateBlockedBadgeStaleness` → early-return if not stale → `console.warn`
   the formatted warning → return `{ ...gates, blocked: null }`). This is
   policy glue, not a trivial primitive call — it encodes what "downgrade"
   means (null out `blocked`, leave `escalated`, warn once) — so a future
   change to that policy (e.g. also zeroing a `blockedBy` field, or adding a
   metric emit) would need to be made in two places, and nothing enforces
   that. That said: the diff is small (~13 lines), well-commented in both
   locations, covered by tests in both consumers, and the shared primitives
   (`evaluateBlockedBadgeStaleness`, `formatStaleBlockedBadgeWarning`) already
   live in `blocked-badge-staleness.mts` — only the orchestration wrapper is
   duplicated, not the actual staleness math or message formatting.
   **Recommendation**: file a low-priority follow-up FEAT/SLICE to hoist
   `applyStaleBlockedBadgePolicy` itself into `blocked-badge-staleness.mts`
   as a shared export (it needs no consumer-specific state beyond `config`
   and `repoPath`, both already threaded uniformly), and have both
   `stop-conditions.mts` and `complete-slice.mts` import it. Not a reason to
   reject this slice — the current duplication is small, correct, and
   tested identically in both places.

3. **Brief JSON shape (additive) — PASS.**
   `crewGates.blocked` gained `stale` and `ageDays` alongside the existing
   `note`/`blockedBy` (`brief.mts:96-118`, applied at the call site
   `brief.mts:219`). Grepped all consumers of `buildBrief`'s output: only
   `src/scripts/loop.mts:164-173` (the `brief` CLI subcommand, which either
   dumps the full JSON via `--explain-halts` or returns the object for the
   CLI's generic printer — no field-by-field destructuring) and the two test
   files. No `commands/*.md` or `docs/**` doc references `crewGates.blocked`'s
   exact shape, and no dashboard/snapshot reader in this repo consumes it
   (searched `commands/` and `docs/` for `crewGates` and `blockedBy` — zero
   hits outside code/tests). Additive fields are safe here.

4. **Tests additive-only — PASS.**
   `git diff origin/main...HEAD -- src/tests/` shows both test files'
   hunks are pure `+` blocks appended after the last pre-existing test (no
   modified or deleted lines in either `stop-conditions.test.mts` or
   `brief.test.mts`).

5. **Pre-existing lint fix (`buildMergeFailedSnapshotEntry`) — PASS,
   behavior-neutral.**
   `stop-conditions.mts:202`: `if (!badge || badge.status !== "failed")` →
   `if (badge?.status !== "failed")`. When `badge` is null/undefined,
   `badge?.status` is `undefined`, and `undefined !== "failed"` is `true` —
   same early-return as the old `!badge` branch. When `badge` exists, both
   forms reduce to the same status comparison. This is a genuine
   `useOptionalChain` mechanical fix on a line untouched by the staleness
   feature itself, not a smuggled behavior change.

## Evidence

- `bun test src/tests/stop-conditions.test.mts src/tests/brief.test.mts` →
  **32 pass, 0 fail** (includes the 7 new tests: 4 in stop-conditions, 3 in
  brief).
- `bun test src/tests/ --parallel --timeout 60000` (full suite) →
  **2705 pass, 1 skip, 0 fail** across 280 files — matches the builder's
  claimed evidence exactly.
- `bunx tsc --project tsconfig.json --noEmit` → clean (exit 0).
- `bunx tsc --project tsconfig.test.json --noEmit` → clean (exit 0).
- `bunx biome lint` + `bunx biome format` (check mode) on the 4 touched
  files → clean, no fixes needed on either.

## Recommendation

Approve as-is. File a low-priority follow-up to hoist the duplicated
`applyStaleBlockedBadgePolicy` glue into `blocked-badge-staleness.mts` as a
shared export consumed by both `stop-conditions.mts` and
`complete-slice.mts`, so the "what does downgrade mean" policy has exactly
one writer instead of two synchronized copies.
