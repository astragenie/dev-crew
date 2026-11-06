---
feature: FEAT-025
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT025 SLICE50**
Cost: $0.5008 · duration 0.3 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $5.07
- p75 $: $7.33
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

