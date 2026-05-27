# Cost Advisor

Target slice: **rich artifact flags for crew agents**
Cost: $14.2847 · duration 3.1 min · cache hit 99.6% · grade avg -

## Baseline (last 3 slices)
- median $: $159.00
- p75 $: $187.72
- median cache hit: 99.4%
- median Opus share: 93.2%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 93.2% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

