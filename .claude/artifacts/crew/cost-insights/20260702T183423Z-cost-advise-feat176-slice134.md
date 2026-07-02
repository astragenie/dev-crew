---
feature: FEAT-176
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT176 SLICE134**
Cost: $3.6460 · duration 18.2 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $9.89
- p75 $: $10.38
- median cache hit: 98.0%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] large-tool-output
- 90th-percentile tool result is 8,578 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

