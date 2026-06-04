---
id: SLICE-40
status: completed
feature: FEAT-038
phase: 2
priority: P2
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-40: Lead dispatch visibility — [MODE] + [CHECKPOINT] signals

Implements FEAT-038. Closure slice — feature was implemented in commits
`48c3fcc` (design spec) and `47e1db7` (implementation) before this session's
formal slice tracking. This slice exists to close the backlog state.

## Implementation evidence

- Commit `47e1db7`: `feat(dispatch): FEAT-038 — [MODE] + [CHECKPOINT] progress signals in dispatchInstruction`
- Commit `48c3fcc`: `spec(visibility): lead dispatch visibility design + FEAT-038`
- Live evidence: every dispatchInstruction output since v0.7.3 contains `## Progress signals` block

## Acceptance criteria

- [x] AC-1: `buildDispatchInstruction` output contains `[MODE]` convention line
- [x] AC-2: `buildDispatchInstruction` output contains `[CHECKPOINT] AC-<N>` convention
- [x] AC-3: `npm test` passes (717/717), lint clean, all quality gates pass
- [x] AC-4: `## Progress signals` block present in dispatch instruction emitted by `slice start`

## Done When

- feature FEAT-038 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
