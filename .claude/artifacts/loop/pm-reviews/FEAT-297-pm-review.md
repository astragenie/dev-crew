---
id: PM-REVIEW-FEAT-297
feature: FEAT-297
reviewed_at: 2026-08-06
pm_customer_impact: 0.8
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.6
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-297

## Demand Assessment

- **Evidence:** none

## Scope Challenge

- **Scope notes:** none

## Scores

- customer_impact: 0.80
- effort_estimate: 0.30
- strategic_alignment: 0.60
- technical_risk: 0.30
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: Live, active blocker on in-flight FEAT-230: extractAcceptanceCriteriaDetailed (backlog-store/slice-store.mts) captures only the first physical line of each markdown AC bullet, and FEAT-230 wrapped its ACs across multiple lines (normal markdown), so SLICE-196 through SLICE-199 all carry ACs that end mid-clause with no Then clause — a builder handed these has nothing to build against or verify at close. Silent by construction (a truncated AC is still a well-formed checkbox item), and this same extractor also backs assertAcceptanceCriteria's presence gate, so the risk generalizes to any FEAT whose ACs wrap. High customer_impact because it directly blocks 4 already-scoped, in-flight slices right now, not a latent risk. Fix is a contained parsing change (accumulate continuation lines) plus a byte-for-byte fixture test and backfilling SLICE-197/198/199 (SLICE-196 already hand-corrected) — moderate effort, low-to-moderate risk, single module. Related: FEAT-290 (per-slice ACs never produced, the other half of why slices carry wrong ACs), FEAT-230 (the affected slices). No cost analog checked this pass.

## Risks

- none
