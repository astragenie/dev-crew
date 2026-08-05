---
id: PM-REVIEW-FEAT-290
feature: FEAT-290
reviewed_at: 2026-08-05
pm_customer_impact: 0.7
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.5
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-290

## Demand Assessment

- **Evidence:** grep for acceptance_criteria across all 221 backlog files returns 0 — every slice ever generated has taken the FEAT-level AC fallback. This is not just historical: SLICE-200 was inspected within a minute of creation on 2026-08-05 and carried all 6 of FEAT-283's ACs though 4 belong to its siblings, and FEAT-284's SLICE-194 carries a corrected AC set while SLICE-191/192/193 still carry the superseded one — live, active sibling drift, not dormant debt. The consumer path (slice-store.mts:296-304) is fully implemented and unit-tested; only the producer (PM contract in agents/pm.md) was never taught the field exists.

## Scope Challenge

- **Scope notes:** Four distinct fixes bundled under one FEAT, per the acceptance direction: (1) add acceptance_criteria to the PM's proposedSlices contract and have the PM assign each AC to its delivering slice — this slice cannot land until FEAT-289 clears agents/pm.md's cap; (2) make slice-store.mts's Done When block conditional so only the final sibling asserts the feature is done; (3) replace the literal '- bullet 1'/'- bullet 2' placeholder strings with something unmistakable; (4) add a gate refusing to dispatch a slice whose body still contains unreplaced placeholders or the shared-AC warning banner. The Objective-line-per-slice fix is folded into the placeholder-replacement slice since both are the same template-quality defect class.

## Scores

- customer_impact: 0.70
- effort_estimate: 0.45
- strategic_alignment: 0.65
- technical_risk: 0.40
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: customer_impact is high (0.7) because this is an active, observed-today correctness defect degrading builder scoping across all 10 currently-pending slices for FEAT-230/259/284, with concrete evidence of sibling AC drift already causing a stale/corrected-AC mismatch. strategic_alignment (0.65) reflects that per-slice AC scoping is core to the loop's slice-based methodology and improves wave-packing quality downstream. effort_estimate (0.45) reflects genuine multi-part scope across two files plus a new gate. dependency_depth is elevated to 0.5 — a real, cited block on FEAT-289 for the PM-contract slice specifically — but stays under the 0.6 disqualifying threshold since the other three slices are unblocked and the block itself resolves by sequencing FEAT-289 first, not by a circular or open-ended dependency. Composite computes P1 under impact>=0.7 AND alignment>=0.6.

## Risks

- The PM-contract slice is hard-blocked on FEAT-289 landing first — do not attempt it against the current 335/335 pm.md
- slice-store.mts's body template is shared by every slice creation in the repo; a bug in the conditional Done When or placeholder logic would silently corrupt every subsequent slice, not just the ones this FEAT targets
- A dispatch gate that's too strict (e.g. false-positives on legitimate placeholder-like text) could block valid slices; needs a precise, narrow match on the actual literal strings and banner text
