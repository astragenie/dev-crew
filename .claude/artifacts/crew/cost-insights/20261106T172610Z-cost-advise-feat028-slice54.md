---
feature: FEAT-028
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT028 SLICE54**
Cost: $26.3593 · duration 726.6 min · cache hit 98.5% · grade avg -

## Baseline (last 9 slices)
- median $: $6.64
- p75 $: $8.34
- median cache hit: 99.7%
- median Opus share: 17.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,170 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] subagent-overuse
- 14 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 3 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 0 → 9 → 14. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $26.3593 is 65% above the last-3 median of $15.9924.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

