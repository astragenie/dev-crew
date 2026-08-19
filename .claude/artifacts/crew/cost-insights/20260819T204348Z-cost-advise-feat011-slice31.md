---
feature: FEAT-011
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT011 SLICE31**
Cost: $3.5702 · duration 8.2 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $8.21
- p75 $: $36.14
- median cache hit: 99.2%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

