---
id: FEAT-023
status: done
priority: P3
category: tech-debt
target_release: null
created: 2026-05-28
updated: 2026-05-28
depends_on: [FEAT-022]
slices: [SLICE-06]
derived_from: null
autonomous_safe: true
triage_notes: no fields needed inference
started_at: 2026-05-28
completed_at: 2026-05-28
github_issue: 26
github_milestone: 1
phase: 1
---
# FEAT-023: TypeScript port — phase 3: stability hardening

## Description

Add integration-level test coverage for the gaps that TypeScript types cannot catch:
gate interaction sequences, cross-module data flow, and regression scenarios for the
specific bugs that occurred during the TS migration and refactoring phases. Audit all
gate functions (`deriveValidationGate`, `deriveTestAdequacyGate`, `runSliceStartGates`,
`computeFeatureResult`) for missing edge case tests. Add ESLint rules that enforce the
new module boundary discipline from FEAT-022. Harden CI: require typecheck + drift guard
on every PR, not just on main.

## Acceptance hints

- Integration tests for `startSlice` → `completeSlice` full-cycle sequences (≥3 scenarios)
- Each gate function has a negative test (gate blocks) and positive test (gate passes)
- ESLint `import/no-restricted-paths` (or equivalent) enforces sub-module boundaries
- `npm run typecheck` enforced in PR CI (currently only on push)
- Test count increases by ≥20 tests targeting previously uncovered integration paths
- Zero regression in existing 401+ tests
