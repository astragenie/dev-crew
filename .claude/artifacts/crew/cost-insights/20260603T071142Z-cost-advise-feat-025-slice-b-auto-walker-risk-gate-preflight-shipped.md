# Cost Advisor

## Performance Grade: A

Target slice: **FEAT-025 SLICE-B — auto-walker risk gate + preflight — SHIPPED**
Cost: $11.1736 · duration 24.9 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $4.02
- p75 $: $5.02
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $11.1736 is 186% above the last-3 median of $3.9014.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

