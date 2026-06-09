---
feature: FEAT-134
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT134 SLICE84**
Cost: $13.0008 · duration 34.4 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $89.14
- p75 $: $96.74
- median cache hit: 98.9%
- median Opus share: 95.6%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,864 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] tool-failure-rate
- 11.7% tool failure rate (9/77).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.6% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

