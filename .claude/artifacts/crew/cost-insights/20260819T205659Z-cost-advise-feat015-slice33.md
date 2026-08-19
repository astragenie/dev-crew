---
feature: FEAT-015
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT015 SLICE33**
Cost: $5.9413 · duration 21.4 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $3.57
- p75 $: $36.14
- median cache hit: 99.2%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $5.9413 is 66% above the last-3 median of $3.5702.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

