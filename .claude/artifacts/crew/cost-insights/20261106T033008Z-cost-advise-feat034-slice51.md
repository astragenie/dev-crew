---
feature: FEAT-034
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT034 SLICE51**
Cost: $6.6408 · duration 9.2 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $3.00
- p75 $: $4.89
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

