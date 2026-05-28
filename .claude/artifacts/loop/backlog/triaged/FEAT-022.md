---
id: FEAT-022
status: triaged
priority: P2
category: tech-debt
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: [FEAT-021]
slices: []
derived_from: null
autonomous_safe: false
triage_notes: no fields needed inference
---
# FEAT-022: TypeScript port — phase 2: refactoring

## Description

Decompose `slice-linker.mts` (738 lines, primary regression source — hit ESLint
complexity cap multiple times) into focused sub-modules with clear interfaces.
Define TypeScript interfaces for the data contracts between modules (`SliceContext`,
`FeatureResult`, `GateResult`, `DispatchInstruction`). Refactor uses the type safety
established in FEAT-021 as a regression net — the compiler catches contract breaks
during the split. Requires human review on each sub-module split because logic moves
between files. `autonomous_safe: false` — architecture decisions need human sign-off.

Primary split targets:
- `slice-linker/start-slice.mts` — `startSlice`, `runSliceStartGates`, `buildStartSliceReturn`
- `slice-linker/complete-slice.mts` — `completeSlice`, `computeFeatureResult`, gate evaluation
- `slice-linker/dispatch.mts` — `buildDispatchInstruction`, `buildReviewLadder` wiring
- `slice-linker/feature-lifecycle.mts` — `sliceFromFeature`, `moveFeatureToDone`

## Acceptance hints

- `slice-linker.mts` split into ≥4 focused sub-modules, each ≤300 lines
- All existing public exports re-exported from `slice-linker.mts` (backward compat)
- TypeScript interfaces defined for all cross-module data shapes
- `npm run typecheck` zero errors after split
- `npm test` passes (all existing tests pass without modification)
- ESLint complexity violations zero (no function exceeds complexity 15)
