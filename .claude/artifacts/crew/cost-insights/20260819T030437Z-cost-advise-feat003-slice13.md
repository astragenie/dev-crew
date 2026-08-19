---
feature: FEAT-003
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT003 SLICE13**
Cost: $2.8576 · duration 31.7 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $2.79
- p75 $: $4.31
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

