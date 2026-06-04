---
phase: "2"
feature: FEAT-007
---
# Cost Advisor

## Performance Grade: B

Target slice: **PHASE2 FEAT007 SLICE39**
Cost: $17.0443 · duration 7.1 min · cache hit 97.6% · grade avg -

## Baseline (last 9 slices)
- median $: $18.36
- p75 $: $28.79
- median cache hit: 96.6%
- median Opus share: 54.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 89.5% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 54.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

