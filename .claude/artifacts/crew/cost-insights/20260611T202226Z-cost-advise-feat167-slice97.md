---
feature: FEAT-167
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT167 SLICE97**
Cost: $6.9853 · duration 13.5 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $18.64
- p75 $: $21.73
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

