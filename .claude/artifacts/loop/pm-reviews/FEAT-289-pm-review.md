---
id: PM-REVIEW-FEAT-289
feature: FEAT-289
reviewed_at: 2026-08-05
pm_customer_impact: 0.5
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.6
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-289

## Demand Assessment

- **Evidence:** agents/pm.md measured at exactly 335/335 lines after SLICE-184's two-line addition consumed the last headroom on an override already raised twice (300 to 325 to 335). Any further edit — including the FEAT-290 remedy that needs this same file — fails CI gate 3 (validate-content-length.mts) today, not hypothetically.

## Scope Challenge

- **Scope notes:** Scored the FEAT's own preferred remedy (extraction) rather than the cheap fix (raise the override a third time), which the FEAT text explicitly argues against as converting a design constraint into a ratchet. Scope: move the 5-dimension scoring rubric and the demand-assessment/scope-challenge/risk-radar/AC-drafting frameworks out of agents/pm.md into a skill or reference file the PM reads on demand; pm.md keeps only the dispatch-critical instructions. Do not simply bump the cap number with no note — that is explicitly the anti-pattern this FEAT exists to stop. Blocks FEAT-290's primary remedy (pm.md contract edit) until this lands, so should sequence ahead of it.

## Scores

- customer_impact: 0.50
- effort_estimate: 0.40
- strategic_alignment: 0.60
- technical_risk: 0.35
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: customer_impact and strategic_alignment are moderate-high (0.5/0.6): the friction is real and recurring but indirect (developer/CI experience, not end-user-visible behavior), and the extraction also cuts per-dispatch token cost since the full pm.md prompt ships on every PM invocation today. effort_estimate at 0.4 reflects the higher-effort preferred fix (restructuring ~335 lines into reference material) rather than the near-zero-effort cap bump the FEAT itself rejects. None of the disqualifying dimensions exceed 0.6, and with inline ACs supplied autonomous_safe holds true. Composite lands P2: impact (0.5) doesn't clear the 0.7 P1 threshold and alignment (0.6) doesn't clear 0.8, so it falls through to the P2 default — appropriately below FEAT-288/FEAT-290's P1 despite gating one of them, since the pain here is friction rather than an active production defect.

## Risks

- Extracting rubric/framework content into a skill changes how reliably the PM agent actually reads it on demand vs. having it inline on every dispatch — must verify scoring/AC quality is unchanged post-extraction, not just that line count dropped
- A partial extraction that still leaves pm.md near its cap recreates the same ratchet risk within a few slices
- This FEAT gates FEAT-290 — under-scoping it (e.g. skipping the margin-warning check) reintroduces the same blind-CI-failure pattern for the next editor
