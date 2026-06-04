---
feature: FEAT-035
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT035 SLICE32**
Cost: $6.1470 · duration 7.1 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $1.29
- p75 $: $1.29
- median cache hit: 99.6%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $6.1470 is 378% above the last-3 median of $1.2859.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

