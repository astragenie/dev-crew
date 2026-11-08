---
feature: FEAT-037
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT037 SLICE56**
Cost: $15.2746 · duration 34.2 min · cache hit 99.2% · grade avg -

## Baseline (last 9 slices)
- median $: $6.64
- p75 $: $15.99
- median cache hit: 99.7%
- median Opus share: 17.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 8 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [LOW] tool-failure-rate
- 7.1% tool failure rate (2/28).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

