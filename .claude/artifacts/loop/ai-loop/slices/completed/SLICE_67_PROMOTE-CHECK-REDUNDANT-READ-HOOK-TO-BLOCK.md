---
id: SLICE-67
status: completed
feature: FEAT-057
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-07
updated: 2026-06-07
completed_at: 2026-06-07
github_issue: 120
github_url: "https://github.com/sergeymilashico/loop/issues/120"
---
# SLICE-67: Promote check-redundant-read hook to block

Implements FEAT-057. See [feature file](../../../backlog/in-progress/FEAT-057.md) for product context.

## Objective

Loop-side surrogate halt-badge for redundant Read calls. The upstream `check-redundant-read` hook (hero-crew) only warns; loop cannot modify the hook itself. This slice reads the hook's per-session state file at `.claude/state/cost-hygiene/<sessionId>.json` (already populated by the upstream hook), counts read events per file path, and emits a new `redundantReadStop` halt-badge from `stop-conditions.mts` when any path's `read_count` exceeds `loop.redundantReadCap` (default 5). Mirrors the FEAT-055 `costRegression` pattern: fail-open, registry-driven, surfaces through `loop brief --explain-halts`.

## In scope

- New module `src/scripts/lib/redundant-read-detector.mts` that reads `.claude/state/cost-hygiene/*.json` files, returns a `RedundantReadSignal | null`
- Add `redundantReadStop` to `HALT_BADGES` registry in `src/scripts/lib/halt-badges.mts` (now 6 fields: costRegression, sessionDrift, sliceCostCeiling, gradeTrend, mergeFailed, redundantReadStop)
- Wire into `src/scripts/lib/stop-conditions.mts` snapshot emit + reason synthesis
- Add `renderRedundantReadStop` renderer for `loop brief --explain-halts`
- New config `loop.redundantReadCap` (default 5) — `src/scripts/lib/config-resolver.mts`
- Update `docs/halt-badges.md` registry doc (per FEAT-063 contract)
- Tests: detector unit tests (state read, threshold boundary, missing dir fail-open, multiple sessions), explain-halts test bump 5→6 fields, halt-badges regression test bump

## Out of scope

- Modifying the upstream hero-crew hook itself (separate upstream-request — already filed at `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`)
- Auto-evicting cost-hygiene state (hook owns its state lifecycle)
- Emitting per-Read deny verdicts (loop is observation-only; only halts the autonomous walker post-fact)

## Acceptance criteria

- [ ] AC-1: New module `src/scripts/lib/redundant-read-detector.mts` exports `checkRedundantReadStop(repoPath, config)` returning `RedundantReadSignal | null`
- [ ] AC-2: Returns `null` when `.claude/state/cost-hygiene/` directory absent (fail-open)
- [ ] AC-3: Returns signal with `{ triggered: true, maxReadCount, path, sessionId, threshold }` when ANY entry in any session JSON has `read_count > threshold`
- [ ] AC-4: Default threshold is 5; configurable via `loop.redundantReadCap` in `.claude/loop.json`
- [ ] AC-5: `redundantReadStop` added to `HALT_BADGES` registry with `renderRedundantReadStop` matching the existing renderer signature
- [ ] AC-6: `stop-conditions.mts` calls detector, emits `redundantReadStop` snapshot field, adds to reasons array on trigger
- [ ] AC-7: Updated `docs/halt-badges.md` documents the new field
- [ ] AC-8: Existing explain-halts test updated to expect 6 fields including `redundantReadStop` in registry order
- [ ] AC-9: New detector unit tests cover: empty dir fail-open, single session under threshold, single session over threshold, multiple sessions (pick max), missing files
- [ ] AC-10: `npm test`, `npm run lint`, `npm run typecheck` all clean

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-057 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A (correctness): verify detector fail-open path is truly safe (no exception escapes); verify threshold semantics is `read_count > threshold` (strict, NOT `>=`) so the default cap of 5 trips at 6+ reads; confirm the registry order placement of `redundantReadStop` (last, per existing convention).
- Reviewer B (registry+explain-halts conformance): verify `docs/halt-badges.md` updates match the new field; verify `renderRedundantReadStop` follows the same body shape as the other 5 renderers (markdown bullets, gate name, suggested action pointing at `loop.redundantReadCap` config knob).
