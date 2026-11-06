---
feature: FEAT-027
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT027 SLICE53**
Cost: $15.9924 · duration 687.3 min · cache hit 98.1% · grade avg -

## Baseline (last 9 slices)
- median $: $5.07
- p75 $: $7.33
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 6,237 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 3 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $15.9924 is 118% above the last-3 median of $7.3255.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

