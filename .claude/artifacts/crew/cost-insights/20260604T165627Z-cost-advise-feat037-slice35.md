---
feature: FEAT-037
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT037 SLICE35**
Cost: $8.3978 · duration 7.8 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $14.56
- p75 $: $23.25
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

