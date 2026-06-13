---
id: SLICE-118
title: Pause / resume conversation lifecycle for async waits (FEAT-128)
status: completed
feature: FEAT-128
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
completed_at: 2026-06-13
---
# SLICE-118: Pause / resume conversation lifecycle for async waits

Closes FEAT-128. Adds file-based pause/resume lifecycle to the autonomous loop.

## In scope

- `src/scripts/lib/paused-for-external-event.mts` — new module; `checkPausedForExternalEvent(repoPath)` reads `.claude/state/loop/paused.json`; fail-open on missing file, malformed JSON, or `triggered !== true`
- `src/scripts/lib/stop-conditions.mts` — 13th parallel call in `gatherStopInputs`; `assembleStopResult` wires `pausedForExternalEvent` halt-badge
- `src/scripts/lib/halt-badges.mts` — 8th `HALT_BADGES` entry; `renderPausedForExternalEvent`
- `src/scripts/loop.mts` — `pause` and `resume` CLI subcommands
- `docs/halt-badges.md` — `snapshot.pausedForExternalEvent` registry section
- `.gitignore` — excludes `.claude/state/loop/paused.json`
- `src/tests/paused-for-external-event.test.mts` — 8 unit tests (all pass)
- `src/tests/explain-halts.test.mts` — registry count + multi-halt fixture for 8th badge
- `CHANGELOG.md` — v0.44.0 entry

## Acceptance criteria

- [x] AC-1: `checkPausedForExternalEvent` returns null on absent file, malformed JSON, missing triggered, triggered=false
- [x] AC-2: `checkPausedForExternalEvent` returns `PausedForExternalEventSignal` when paused.json is valid and `triggered: true`
- [x] AC-3: `pausedForExternalEvent` badge wired into stop-check; `shouldStop: true` when triggered
- [x] AC-4: `pause` CLI subcommand writes paused.json with reason, resumeHint, pausedAt, triggered: true
- [x] AC-5: `resume` CLI subcommand deletes paused.json; idempotent on absent file
- [x] AC-6: `docs/halt-badges.md` updated with `snapshot.pausedForExternalEvent` registry entry
- [x] AC-7: `.gitignore` excludes paused.json
- [x] AC-8: 8 unit tests pass; explain-halts test updated for 8th badge

## Gates

- Reviewer A: PASS
- Reviewer B: PASS
- Validator: PASS

## Done When

- All ACs PASS. CHANGELOG entry. FEAT-128 moved to done. Grade filed.
