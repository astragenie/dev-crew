---
feature: FEAT-048
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT048 SLICE46**
Cost: $0.2520 · duration 0.5 min · cache hit 98.2% · grade avg -

## Baseline (last 9 slices)
- median $: $3.48
- p75 $: $3.58
- median cache hit: 98.7%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 5,003 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

