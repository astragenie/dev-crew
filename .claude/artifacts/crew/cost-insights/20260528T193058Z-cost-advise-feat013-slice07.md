---
feature: FEAT-013
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT013 SLICE07**
Cost: $0.3143 · duration 4.9 min · cache hit 98.7% · grade avg -

## Baseline (last 9 slices)
- median $: $160.28
- p75 $: $529.90
- median cache hit: 97.5%
- median Opus share: 87.2%

## Per-slice findings
- No rules fired. This slice is within healthy bounds.
## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 87.2% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

