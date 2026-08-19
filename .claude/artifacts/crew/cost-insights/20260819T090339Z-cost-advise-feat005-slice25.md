---
feature: FEAT-005
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT005 SLICE25**
Cost: $26.4347 · duration 111.9 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $14.64
- p75 $: $24.35
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

