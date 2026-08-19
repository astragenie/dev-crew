---
feature: FEAT-018
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT018 SLICE29**
Cost: $1.6894 · duration 2.3 min · cache hit 99.6% · grade avg -

## Baseline (last 9 slices)
- median $: $26.43
- p75 $: $36.14
- median cache hit: 99.2%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

