---
feature: FEAT-042
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT042 SLICE42**
Cost: $1.2829 · duration 4.0 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $6.72
- p75 $: $17.04
- median cache hit: 97.8%
- median Opus share: 54.0%

## Per-slice findings
### [LOW] tool-failure-rate
- 7.1% tool failure rate (1/14).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 54.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

