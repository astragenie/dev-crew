---
feature: FEAT-037
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT037 SLICE58**
Cost: $36.2803 · duration 47.2 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $7.33
- p75 $: $15.99
- median cache hit: 99.5%
- median Opus share: 17.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 8 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

