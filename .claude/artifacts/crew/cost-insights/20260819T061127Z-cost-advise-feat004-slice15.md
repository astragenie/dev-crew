---
feature: FEAT-004
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT004 SLICE15**
Cost: $20.7022 · duration 183.4 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $2.22
- p75 $: $3.18
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

