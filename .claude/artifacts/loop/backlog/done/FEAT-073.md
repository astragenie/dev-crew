---
id: FEAT-073
status: done
priority: P1
category: refactor
target_release: v0.26.0
autonomous_safe: true
created: 2026-06-07
updated: 2026-06-07
depends_on: [FEAT-072]
slices: [SLICE-74]
derived_from: SPEC-004
pm_customer_impact: 0.4
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.8
pm_technical_risk: 0.3
pm_dependency_depth: 0.15
composite_priority: P1
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=SPEC-004 → true"
started_at: 2026-06-07
slices_complete: [SLICE-74]
completed_at: 2026-06-07
---
## Description

Continue graduated tsconfig tightening (B4+B5 combined):

B4: Enable `exactOptionalPropertyTypes: true`. Fix all sites where `undefined` is explicitly assigned to optional properties. Two valid patterns:
- Widen the type: `name?: string | undefined`
- Change call site to omit the property when absent

B5: Enable `noUncheckedIndexedAccess: true`. Narrow every `arr[i]` and `record[key]` read site. Prefer `for..of` over indexed loops. Add explicit absence guards at each narrowing site.

If B5 dry-run reports > 80 errors, ship B4 alone and defer B5 to a separate FEAT.

## Acceptance hints

- After: `npm run typecheck` exits 0
- After: `npm run lint` exits 0, zero warnings
- After: `npm test` exits 0, all tests pass
- Derived from: SPEC-004