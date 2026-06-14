---
feature: FEAT-174
status: active
---
# Run Brief: FEAT174 SLICE124: Error-pattern registry with automatic recovery for specialist dispatch failures

- Created: 2026-06-13T14:49:54.428Z
- Tier: full
- Goal: Competitor gap (Maestro v0.15.3). Maestro maintains a per-agent error-pattern registry that detects known failure signatures in agent output and triggers automatic recovery plus user-friendly messages. Loop handles the recurring specialist-pause failure mode (builder/reviewer/validator pauses without writing artifact) only via a manual SOP doc (docs/sop/specialist-pause-handling.md). Proposal: codify the SOP into machine-checkable patterns (pause-without-artifact, empty artifact, truncated outpu
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `src/scripts/lib/error-pattern-registry.mts`: `ErrorPattern` interface + 4 built-in patterns (pause-without-artifact
  - empty-artifact
  - truncated-output
  - budget-exceeded); `matchPatterns(output: string): ErrorPattern | null`
- `checkDispatchResult(builderOutput: string
  - artifactPath: string): RecoveryAction | null` consulted after builder completes; returns recovery hint (retry-with-inline
  - re-dispatch
  - escalate)
- On match: append one JSON line to `.claude/artifacts/loop/learnings.jsonl` with pattern id + sliceId + timestamp
- `src/tests/error-pattern-registry.test.mts` ≥6 tests
- Out Of Scope:
  - - Auto-retry execution (return recovery hint only; operator executes retry)
- UI or dashboard for pattern frequency
- Changes to builder/reviewer dispatch flow (this is a post-result check only)
- Planned Files: -
- Next Step: Begin implementation

