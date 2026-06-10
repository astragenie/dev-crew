---
id: SLICE-18
status: completed
feature: FEAT-006
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
github_issue: 38
github_url: "https://github.com/sergeymilashico/loop/issues/38"
---
# SLICE-18: FEAT-006 SLICE-B — Plan Mode conditional approval gate

Implements FEAT-006 SLICE-B. See [feature file](../../../backlog/triaged/FEAT-006.md).

## Objective

Wire `runPlanPreflight` into `startSlice` ceremony and add a conditional
approval gate: fires when the linked feature has `autonomous_safe: false` and
loop is not in auto mode. Exported `computeApprovalGate` helper is unit-tested.

## Deliverables

1. `src/scripts/lib/slice-linker/start-slice.mts`:
   - `computeApprovalGate(autonomousSafe, autoMode, dispatch)` exported helper
   - `planPreflight` added to gatherSliceResources Promise.all (bestEffort)
   - `autonomous_safe` read from feature frontmatter via `findFeatureById`
   - `requiresApprovalGate` + `planPreflight` included in startSlice return
   - `nextAction` updated when gate fires
2. `src/tests/slice-start-plan-gate.test.mts` — 5 tests for all gate paths

## Acceptance criteria

- [x] AC1: `computeApprovalGate(false, false, true)` → true — PASS
- [x] AC2: `computeApprovalGate(true, false, true)` → false — PASS
- [x] AC3: `computeApprovalGate(false, true, true)` → false (auto mode suppresses) — PASS
- [x] AC4: `computeApprovalGate(false, false, false)` → false (dispatch=false) — PASS
- [x] AC5: `planPreflight` runs bestEffort parallel, present in return — PASS
- [x] AC6: `requiresApprovalGate` present in startSlice return — PASS
- [x] AC7: 535 tests pass, lint clean — PASS

## Evidence

- `npm test`: 535/535 pass (baseline 530, +5 new)
- `npm run lint`: clean
- Review: APPROVED
- `requires_validation: false` — control-flow change, test suite is validation
