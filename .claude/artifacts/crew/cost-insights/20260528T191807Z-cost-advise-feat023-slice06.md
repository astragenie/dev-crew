---
feature: FEAT-023
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT023 SLICE06**
Cost: $0.6755 · duration 8.1 min · cache hit 99% · grade avg -

## Baseline (last 9 slices)
- median $: $160.28
- p75 $: $529.90
- median cache hit: 97.5%
- median Opus share: 87.3%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 5,150 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 87.3% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

