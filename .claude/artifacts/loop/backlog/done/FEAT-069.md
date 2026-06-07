---
id: FEAT-069
status: done
priority: P2
category: tech-debt
target_release: v0.26.0
created: 2026-06-07
updated: 2026-06-07
depends_on: []
dependencies: []
slices: [SLICE-69, SLICE-70, SLICE-71]
derived_from: SPEC-004
composite_score: 0.69
composite_priority: P2
autonomous_safe: true
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_demand_signal: 0.7
pm_implementation_confidence: 0.85
pm_reasoning: "Phase A dead-code sweep — bounded surgical deletes of confirmed-dead modules per DEC-011; low technical risk, no behavior change, unblocks Phase B."
triage_notes: "Scored from SPEC-004 (decomposed). Five deprecated/one-shot modules + 3 paired tests identified. Risk register flags 'A1 verifies via npm test; A1 step ordering requires loop-installer caller removal before legacy-migrator delete' — manageable. autonomous_safe=true: deletes are CI-guarded, deterministic, no contract change. Phase A blocks Phase B/C in SPEC-004 execution order."
phase: 3
tags: [refactor, infra]
needs_contract: false
needs_ux: false
started_at: 2026-06-07
slices_complete: [SLICE-69, SLICE-70, SLICE-71]
completed_at: 2026-06-07
---
# FEAT-069: Dead-code sweep — delete marker-queue + one-shot migrators

## Description

Delete the confirmed-dead modules and their tests under `src/scripts/lib/`,
per SPEC-004 Phase A and DEC-011 (marker-queue dispatch path superseded).
Targets:

- `marker-drain.mts` and the marker-write path inside `auto-dispatch.mts`
- `adhoc-migrator.mts`
- `legacy-migrator.mts`
- `codemod-add-any.mts`
- `migrate-product-backlog.mts`
- 3 paired test files

Update callers in `loop-installer.mts` and
`slice-linker/complete-slice.mts` before deletion so CI stays green.

Target: ≥1500 LoC net reduction; CI green; zero `/loop:*` behavior change.

## Acceptance hints

- Each deprecated module + its paired test deleted in one slice
- `loop-installer.mts` caller removed before `legacy-migrator` delete (step order matters)
- `auto-dispatch.mts` keeps `dispatchAgent` export per DEC-011; only marker-write path removed
- `npm test`, `npm run lint`, `npm run typecheck` green per slice
- No new `/loop:*` halt-badge or behavior diff
- Net LoC delta ≤ -1500

## Sequencing

Blocks FEAT-070 and FEAT-071. Phase A must land first so tsconfig
tighten (B) and perf wins (C) operate on a reduced surface area.

## References

- SPEC-004 — Code-Quality Pivot
- DEC-011 — marker-queue dispatch deprecation (supersedes DEC-004)
