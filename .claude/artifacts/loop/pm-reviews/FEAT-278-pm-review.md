---
id: PM-REVIEW-FEAT-278
feature: FEAT-278
reviewed_at: 2026-08-04
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.7
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-278

## Demand Assessment

- **Evidence:** Confirmed in planner.mts:38-99 that the capacity guard (`if (picked.length >= opts.waveSize) break;`) exits the loop with zero rejection recorded for any unexamined candidate, while the sibling missing-confidence path (lines 47-82) already lands every candidate in items or rejected -- exactly the SLICE-179 rejection-completeness pattern this FEAT extends. waveSize<=0 also confirmed to silently empty the plan (guard fires on iteration 1, missingQueue stays empty, nothing to reject).

## Scope Challenge

- **Scope notes:** Single-file, single-function fix in src/scripts/lib/wave/planner.mts. Push a distinct rejection reason (e.g. capacity_exhausted) for every candidate not examined once the wave is full, and explicitly guard/validate waveSize<=0. No cross-module reach.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.20
- strategic_alignment: 0.70
- technical_risk: 0.15
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2: real, evidence-grounded completeness gap (confirmed by reading planner.mts -- the capacity guard bypasses the rejection-completeness invariant SLICE-179 established for the missing-confidence path) but narrow in blast radius -- wave mode's capacity guard rarely fires in practice (waveSize is normally sized to the backlog) and there is no demonstrated incident, unlike FEAT-268's active corruption. Low effort (single function, mirrors an already-reviewed pattern in the same file) and low risk (pure, deterministic, easily unit-tested) keep it a strong low-cost fix, capped below P1 by the narrow real-world trigger frequency. Pairs with FEAT-276 SLICE-182 (wave telemetry) as the consumer that surfaces these reasons -- not a blocking dependency, just a natural follow-on.

## Risks

- none
