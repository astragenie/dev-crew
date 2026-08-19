---
feature: FEAT-002
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT002 SLICE10**
Cost: $0.7280 · duration 1.3 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $2.72
- p75 $: $3.36
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

