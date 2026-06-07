---
feature: FEAT-068
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT068 SLICE68**
Cost: $6.0971 · duration 2.2 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $23.59
- p75 $: $30.58
- median cache hit: 99.7%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

