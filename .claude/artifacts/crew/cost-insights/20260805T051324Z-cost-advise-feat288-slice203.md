---
feature: FEAT-288
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT288 SLICE203**
Cost: $2.7540 · duration 4.0 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $4.96
- p75 $: $6.66
- median cache hit: 99.6%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

