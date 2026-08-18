---
feature: FEAT-002
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT002 SLICE06**
Cost: $4.3058 · duration 18.3 min · cache hit 99.4% · grade avg -

## Baseline (last 5 slices)
- median $: $2.54
- p75 $: $2.72
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $4.3058 is 41% above the last-3 median of $3.0539.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

