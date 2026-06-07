---
id: FEAT-070
status: done
priority: P2
category: tech-debt
target_release: v0.26.0
created: 2026-06-07
updated: 2026-06-07
depends_on: [FEAT-069]
dependencies: [FEAT-069]
slices: [SLICE-72]
derived_from: SPEC-004
composite_score: 0.74
composite_priority: P2
autonomous_safe: false
pm_customer_impact: 0.6
pm_effort_estimate: 0.8
pm_strategic_alignment: 0.85
pm_technical_risk: 0.65
pm_dependency_depth: 0.5
pm_demand_signal: 0.7
pm_implementation_confidence: 0.55
pm_reasoning: "Phase B tsconfig tighten — 8 graduated slices touching ~71 files (255 `: any`, 33 `as any`, 23 catch-any). Result<T,E>/branded IDs/discriminated unions add design surface. Higher composite than FEAT-069 but sequenced AFTER it; autonomous_safe=false because Result<T,E> retrofit + B5 noUncheckedIndexedAccess touch every loop body — needs reviewer eyes per slice."
triage_notes: "Scored from SPEC-004 (decomposed). Composite (0.74) exceeds FEAT-069 (0.69), but SPEC-004 sequencing constraint pins this AFTER Phase A — Phase A reduces the surface area Phase B has to retype. Walker must respect dependencies=[FEAT-069]. B5 (noUncheckedIndexedAccess) pre-split into B5a/B5b per SPEC risk register. autonomous_safe=false: Result<T,E> seam choice and branded-ID rollout are architectural judgment calls that should land via reviewer gate, not auto-dispatch. Recommend per-slice review."
phase: 3
tags: [refactor, infra]
needs_contract: true
needs_ux: false
started_at: 2026-06-07
slices_complete: [SLICE-72]
completed_at: 2026-06-07
---
# FEAT-070: Tsconfig tighten + standards alignment — graduated flag rollout + Result/branded/discriminated unions

## Description

Align `tsconfig.json` with the team TypeScript standards at
`C:\work\mega\standards\docs\typescript\coding-conventions.md`
(excluding React-specific rules — Node CLI plugin). Then apply
Result<T, E>, branded IDs, and discriminated unions where they remove
a real failure mode, per SPEC-004 Phase B.

8 graduated slices, one tsconfig flag per slice:

1. B1 — `noImplicitAny: true` + `useUnknownInCatchVariables: true`
2. B2 — `noUnusedLocals: true` + `noUnusedParameters: true`
3. B3 — `noImplicitOverride: true` + `noFallthroughCasesInSwitch: true`
4. B4 — `exactOptionalPropertyTypes: true`
5. B5a/B5b — `noUncheckedIndexedAccess: true` (split by directory)
6. B6 — Result<T, E> rollout for parsers + gates (entry points keep throw/catch at boundary)
7. B7 — Branded IDs for FEAT / SLICE / SPEC / DEC / GRADE
8. B8 — Discriminated unions replacing boolean-flag state shapes in `stop-conditions`, `walker-gates`, `halt-badges`

## Acceptance hints

- `tsconfig.json` matches relevant subset of standards doc per slice
- CI green per slice (`npm run typecheck`, `npm run lint`, `npm test`)
- Result<T, E> does not leak past parser / gate seam — callers in `loop.mts` unchanged
- Each slice reviewer-gated; no autonomous-safe walker pickup

## Sequencing

Depends on FEAT-069 (Phase A dead-code sweep) landing first — Phase B
operates on the reduced surface area Phase A produces. Phase B then
blocks FEAT-071 (Phase C perf) so perf wins land on a type-tight
codebase.

## References

- SPEC-004 — Code-Quality Pivot
- Standards: `C:\work\mega\standards\docs\typescript\coding-conventions.md`
- Standards: `C:\work\mega\standards\docs\patterns\design-patterns.md`
