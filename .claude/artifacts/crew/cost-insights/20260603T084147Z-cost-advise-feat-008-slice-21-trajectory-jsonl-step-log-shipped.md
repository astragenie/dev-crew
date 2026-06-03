# Cost Advisor

## Performance Grade: B

Target slice: **SLICE-21**
Cost: $12.9439 · duration 25.2 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $8.99
- p75 $: $11.17
- median cache hit: 99.6%
- median Opus share: 0.0%

## Per-slice findings
- No rules fired. This slice is within healthy bounds.
## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $12.9439 is 67% above the last-3 median of $7.7425.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

