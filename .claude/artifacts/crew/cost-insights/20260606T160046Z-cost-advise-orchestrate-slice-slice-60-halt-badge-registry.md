# Cost Advisor

## Performance Grade: A

Target slice: **SLICE-60**
Cost: $10.2655 · duration 1.7 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $8.50
- p75 $: $22.50
- median cache hit: 99.9%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $10.2655 is 21% above the last-3 median of $8.5013.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

