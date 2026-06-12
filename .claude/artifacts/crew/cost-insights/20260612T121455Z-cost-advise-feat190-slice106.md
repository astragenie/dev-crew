---
feature: FEAT-190
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT190 SLICE106**
Cost: $10.4223 · duration 2.7 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $13.43
- p75 $: $28.40
- median cache hit: 99.3%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

