# Cost Advisor

## Performance Grade: C

Target slice: **SLICE-14**
Cost: $7.3878 · duration 15.0 min · cache hit 99% · grade avg -

## Baseline (last 9 slices)
- median $: $5.96
- p75 $: $15.78
- median cache hit: 99.4%
- median Opus share: 100.0%

## Per-slice findings
### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [LOW] tool-failure-rate
- 6.7% tool failure rate (3/45).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

