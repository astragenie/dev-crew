---
feature: FEAT-037
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT026 SLICE52**
Cost: $30.7658 · duration 744.8 min · cache hit 98.6% · grade avg -

## Baseline (last 9 slices)
- median $: $6.64
- p75 $: $15.99
- median cache hit: 99.7%
- median Opus share: 17.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,047 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] subagent-overuse
- 15 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 3 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 9 → 14 → 15. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

