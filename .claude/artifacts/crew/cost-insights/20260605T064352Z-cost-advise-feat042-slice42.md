---
feature: FEAT-042
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT042 SLICE42**
Cost: $1.3332 · duration 4.1 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $2.17
- p75 $: $17.04
- median cache hit: 98.1%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] tool-failure-rate
- 13.3% tool failure rate (2/15).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

