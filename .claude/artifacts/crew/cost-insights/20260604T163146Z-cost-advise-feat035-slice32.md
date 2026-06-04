---
feature: FEAT-035
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT035 SLICE32**
Cost: $1.2859 · duration 6.1 min · cache hit 99.6% · grade avg -

## Baseline (last 9 slices)
- median $: $0.00
- p75 $: $0.00
- median cache hit: 0.0%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

