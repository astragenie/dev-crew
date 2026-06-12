---
feature: FEAT-192
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT192 SLICE108**
Cost: $18.0184 · duration 4.7 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $17.22
- p75 $: $34.21
- median cache hit: 99.4%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] tool-failure-rate
- 6.7% tool failure rate (1/15).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

