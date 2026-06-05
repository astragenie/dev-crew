---
feature: FEAT-040
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT040 SLICE41**
Cost: $1.9110 · duration 14.8 min · cache hit 98.1% · grade avg -

## Baseline (last 9 slices)
- median $: $14.37
- p75 $: $17.04
- median cache hit: 97.6%
- median Opus share: 54.0%

## Per-slice findings
### [MEDIUM] large-tool-output
- 90th-percentile tool result is 15,023 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $1.9110 is 1691% above the last-3 median of $0.1067.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 54.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

