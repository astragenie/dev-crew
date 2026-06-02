# Cost Advisor

## Performance Grade: B

Target slice: **SLICE-16**
Cost: $5.0211 · duration 6.0 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $5.96
- p75 $: $8.52
- median cache hit: 99.5%
- median Opus share: 27.2%

## Per-slice findings
### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $5.0211 is 21% above the last-3 median of $4.1386.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

