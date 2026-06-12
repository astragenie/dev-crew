---
feature: FEAT-194
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT194 SLICE110**
Cost: $49.9827 · duration 6.1 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $17.22
- p75 $: $34.21
- median cache hit: 99.6%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] tool-failure-rate
- 6.1% tool failure rate (2/33).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $49.9827 is 177% above the last-3 median of $18.0184.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

