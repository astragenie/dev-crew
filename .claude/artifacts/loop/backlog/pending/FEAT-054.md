---
id: FEAT-054
status: pending
priority: P3
category: workflow
target_release: null
created: 2026-06-06
updated: 2026-06-06
depends_on: []
slices: []
derived_from: null
---
## Context

/crew:orchestrate-slice's Step 4 (reviewer) → Step 5 (validator) order assumes reviewer reliably produces an artifact. Observed in SLICE-51: reviewer paused twice mid-investigation without writing the review-result.

For SHORT slices (≤6 ACs, ≤10 files changed) where validator can exercise behavior cheaply, running validator FIRST and reviewer second has two upsides:
- Validator gives independent runtime evidence regardless of reviewer reliability
- Reviewer then runs with the validator's evidence already in hand (review can scope to code-review only, narrower task, more likely to complete)

## Acceptance criteria

- [ ] Document the conditional reordering in /crew:orchestrate-slice or in a new section of agents/lead.md: when slice scope is short AND BEHAVIOR_CHANGED, swap Step 4 and Step 5
- [ ] Define 'short' precisely: AC count ≤6 OR builder handoff changed-files count ≤10 (use the lower-bar gate)
- [ ] Reviewer prompt in the swapped order receives validation-result path as additional input — reviewer can confirm validator findings rather than independently re-verify
- [ ] Default to current order for long slices (cross-plugin, ≥10 files, ≥7 ACs)
- [ ] Tests: dispatch ordering follows the size heuristic correctly

## Related

- GRADE-SLICE-51 'What I would do differently next time' — already recommends this
- Could pair with FEAT-052 (reviewer-agent reliability) for layered defense

## Notes

This is a /crew:orchestrate-slice change (hero-crew side). Loop tracks for traceability.