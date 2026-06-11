---
feature: FEAT-181
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT181 SLICE95**
Cost: $15.8649 · duration 13.0 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $16.33
- p75 $: $19.89
- median cache hit: 99.2%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

