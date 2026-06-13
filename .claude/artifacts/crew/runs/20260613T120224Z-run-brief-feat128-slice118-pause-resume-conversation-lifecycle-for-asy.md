---
feature: FEAT-128
status: active
---
# Run Brief: FEAT128 SLICE118: Pause / resume conversation lifecycle for async waits

- Created: 2026-06-13T12:02:24.599Z
- Tier: full
- Goal: Add a first-class `pausedForExternalEvent` halt-badge to the autonomous loop walker so operators can suspend the loop on an external wait (CI run, PR review, deploy gate) and resume cleanly without session-end-and-restart.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/paused-for-external-event.mts` — new module: `checkPausedForExternalEvent` reads `.claude/state/loop/paused.json`
  - returns signal or null
- `src/scripts/lib/stop-conditions.mts` — import + wire new badge into `gatherStopInputs`
  - `checkStopConditions`
  - `assembleStopResult`
- `src/scripts/loop.mts` — add `pause` and `resume` subcommands (see CLI shape below)
- `docs/halt-badges.md` — add `snapshot.pausedForExternalEvent` registry entry
- `src/tests/paused-for-external-event.test.mts` — tests (see ACs)
- Out Of Scope:
  - - Interactive UI or notifications
- Integration with specific CI providers
- Modifying the `/loop:pause` command file (that's a separate doc-writer task)
- Retry-tracking or iterative refinement (FEAT-130)
- Planned Files: -
- Next Step: Begin implementation

