---
feature: FEAT-089
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT089 SLICE85**
Cost: $3.1327 · duration 9.3 min · cache hit 94.2% · grade avg -

## Baseline (last 9 slices)
- median $: $41.39
- p75 $: $96.74
- median cache hit: 98.9%
- median Opus share: 91.4%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 94.2% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [LOW] large-tool-output
- 90th-percentile tool result is 4,242 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [LOW] tool-failure-rate
- 5.3% tool failure rate (1/19).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 91.4% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

