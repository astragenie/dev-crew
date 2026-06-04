# Cost Advisor

## Performance Grade: B

Target slice: **SLICE-39**
Cost: $21.5401 · duration 7.1 min · cache hit 96.1% · grade avg -

## Baseline (last 9 slices)
- median $: $18.36
- p75 $: $74.62
- median cache hit: 96.6%
- median Opus share: 54.0%

## Per-slice findings
### [MEDIUM] opus-overuse
- Opus accounts for 70.8% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] large-tool-output
- 90th-percentile tool result is 4,304 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $21.5401 is 27% above the last-3 median of $16.9965.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 54.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

