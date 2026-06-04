---
phase: "2"
feature: FEAT-010
---
# Run Brief: PHASE2 FEAT010 SLICE36

- Created: 2026-06-04T17:08:47.516Z
- Goal: Add a `confidence: "green" | "yellow" | "red"` field to the `slice start` ceremony output. Computed deterministically from already-available signals — NO LLM call. Helps the user (and downstream tooling like LoopObserver) see whether the loop is on solid ground before dispatching the builder.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New module `src/scripts/lib/confidence-signal.mts`:
  - `computeConfidence(opts: { sliceFm
  - featureFm
  - sliceBody
  - recentGradeAvg }): { confidence: "green"|"yellow"|"red"
  - reason: string }`
  - Pure function
  - no IO
  - fully unit-testable
- Wire into `src/scripts/lib/slice-linker/start-slice.mts`:
  - Load FEAT frontmatter (already available via slice's `feature` field)
  - Load AC count via `detectAcceptanceCriteria` (from backlog-triage helpers
  - reused)
  - Load `recentGradeAvg` from `checkGradeTrend` (already called)
  - Call `computeConfidence` + include result in start-slice return
- Wire into slice-progress dashboard (`src/scripts/lib/slice-linker/slice-progress.mts`):
  - Show confidence emoji + reason in the active-slice header row
- `src/tests/confidence-signal.mts` (new) — unit tes
- Out Of Scope:
  - - Mid-execution confidence updates (SLICE-B
  - future)
- LLM-driven confidence (always deterministic this slice)
- CLI flag to override / suppress confidence (always emitted)
- Confidence persistence in grade artifacts (orthogonal; could be follow-up)
- Visual emoji vs text rendering choices in LoopObserver (consumer-side concern)
- Planned Files: -
- Next Step: Begin implementation

