---
feature: FEAT-054
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT054 SLICE81**
Cost: $1.9679 · duration 34.7 min · cache hit 98.4% · grade avg -

## Baseline (last 9 slices)
- median $: $17.62
- p75 $: $42.46
- median cache hit: 98.6%
- median Opus share: 85.3%

## Per-slice findings
### [HIGH] subagent-overuse
- 12 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] tool-failure-rate
- 15.0% tool failure rate (3/20).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 85.3% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

