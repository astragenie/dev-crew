---
feature: FEAT-013
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT013 SLICE34**
Cost: $4.1644 · duration 11.0 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $3.50
- p75 $: $5.94
- median cache hit: 99.6%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

