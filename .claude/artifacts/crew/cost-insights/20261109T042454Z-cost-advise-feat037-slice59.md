---
feature: FEAT-037
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT037 SLICE59**
Cost: $17.0018 · duration 231.1 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $15.27
- p75 $: $26.36
- median cache hit: 99.2%
- median Opus share: 17.0%

## Per-slice findings
### [MEDIUM] subagent-overuse
- 6 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

