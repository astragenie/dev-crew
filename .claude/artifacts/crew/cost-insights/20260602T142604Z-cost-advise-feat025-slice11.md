---
feature: FEAT-025
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT025 SLICE11**
Cost: $4.6533 · duration 7.0 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $5.50
- p75 $: $75.91
- median cache hit: 99.3%
- median Opus share: 31.4%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

