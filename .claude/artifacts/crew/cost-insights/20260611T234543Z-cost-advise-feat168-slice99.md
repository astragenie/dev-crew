---
feature: FEAT-168
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT168 SLICE99**
Cost: $13.4295 · duration 3.9 min · cache hit 98.8% · grade avg -

## Baseline (last 9 slices)
- median $: $17.26
- p75 $: $21.73
- median cache hit: 99.3%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $13.4295 is 42% above the last-3 median of $9.4352.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

