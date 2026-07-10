---
id: SLICE-148
title: "Tick resilience: unreachable / insufficient-scope repos (B3 AC-2)"
status: completed
feature: FEAT-244
phase: null
priority: P2
target_release: null
requires_validation: true
risk: low
created: 2026-07-10
updated: 2026-07-10
effort_points: 1
touches_files: [src/scripts/lib/watch/sweep.mts, src/scripts/lib/watch/state.mts, src/scripts/lib/watch/types.mts, src/scripts/lib/watch/tick.mts, src/scripts/lib/watch/envelopes.mts, src/scripts/lib/watch.mts, src/tests/watch-sweep-errors.test.mts]
completed_at: 2026-07-10
---
# SLICE-148: Tick resilience — unreachable / insufficient-scope repos (B3 AC-2)

Implements FEAT-244 (Track B3 code half). See [feature file](../../../backlog/in-progress/FEAT-244.md).

## Objective

A registry entry the token cannot reach (403/404 from `gh`) must not fail silently and must not crash the whole tick: the sweep records a clear per-repo "unreachable / insufficient scope" error state (in that repo's tick-owned state, per COND-2 ownership) and continues sweeping the remaining assigned entries. Repeated failures should not spam state — record last-error + timestamp + consecutive-failure count, not an unbounded log.

## In scope

- Per-entry try/catch in the sweep loop (`sweepEntry` callers) classifying gh failures: 403/insufficient-scope vs 404/not-found vs other (network etc.) — distinguishable in the recorded state
- Tick-owned state field (e.g. `lastSweepError: { kind, message, at, consecutiveCount }`) written via the existing atomic state path; cleared on next successful sweep of that entry
- Tick summary/envelope reflects per-repo error counts so a dashboard can see a repo went dark
- Tests (`src/tests/watch-sweep-errors.test.mts`): simulate 403 and 404 from the gh exec for one repo among several; assert remaining repos still swept, error state recorded with correct kind, error cleared after a subsequent successful sweep, and tick exit is clean (no throw)

## Out of scope

- Spawn/allowlist work (SLICE-149)
- Retry/backoff policy beyond the consecutive-failure counter (future FEAT if needed)
- Alerting on darkened repos (astrarunner dashboard side, FEAT-B2)

## Acceptance criteria

- [x] AC-2 [B3]: Given a registry entry for a private repo the PAT cannot reach, When a tick attempts to sweep it, Then the tick logs a clear "unreachable / insufficient scope" state rather than failing silently or crashing the whole tick — evidenced by a test simulating a 403/404 from `gh` for one repo and asserting the tick continues sweeping remaining repos with a recorded per-repo error state. (source: 2026-07-07-watcher-acs-eta.md AC-2, B3 section)
- [x] AC-2b: Given a previously-erroring repo becomes reachable again, When the next tick sweeps it successfully, Then the recorded error state is cleared — evidenced by a two-tick test asserting the error field is present after tick 1 and absent (or reset) after tick 2.

## Done When

- all acceptance criteria PASS with evidence
- build / test commands per `.claude/loop.json` pass
- feature FEAT-244 rolls to done/ when both SLICE-149 and SLICE-148 are closed
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: correctness + AC coverage (repo ladder ["A"])
