---
feature: FEAT-005
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT005 SLICE23**
Cost: $14.6441 · duration 67.3 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $20.70
- p75 $: $20.70
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

