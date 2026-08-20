---
feature: FEAT-017
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT017 SLICE45**
Cost: $2.9541 · duration 15.8 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $4.16
- p75 $: $4.89
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

