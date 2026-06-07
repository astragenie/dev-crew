---
id: FEAT-072
status: in-progress
priority: P1
category: refactor
target_release: v0.26.0
autonomous_safe: true
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: [SLICE-73]
derived_from: SPEC-004
pm_customer_impact: 0.4
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.8
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_priority: P1
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=SPEC-004 → true"
started_at: 2026-06-07
---
## Description

Continue graduated tsconfig tightening from FEAT-070 B1 (noImplicitAny done).

B2: Enable `noUnusedLocals: true` and `noUnusedParameters: true` in tsconfig.json. Fix all resulting TS6133/TS6196 errors by deleting unused locals/imports and prefixing intentionally-unused callback parameters with `_`.

B3: Enable `noImplicitOverride: true` and `noFallthroughCasesInSwitch: true`. Add `override` keyword to any subclass methods that need it; fix any switch fall-through.

## Acceptance hints

- After: `npm run typecheck` exits 0
- After: `npm run lint` exits 0, zero warnings
- After: `npm test` exits 0, all tests pass
- Derived from: SPEC-004