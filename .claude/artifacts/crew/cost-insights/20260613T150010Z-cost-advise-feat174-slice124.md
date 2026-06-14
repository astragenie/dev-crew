---
feature: FEAT-174
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT174 SLICE124**
Cost: $2.7993 · duration 10.3 min · cache hit 93.9% · grade avg -

## Baseline (last 9 slices)
- median $: $6.69
- p75 $: $142.78
- median cache hit: 97.3%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 93.9% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] subagent-overuse
- 12 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

