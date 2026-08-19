---
feature: FEAT-009
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT009 SLICE32**
Cost: $7.5230 · duration 24.4 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $3.57
- p75 $: $8.21
- median cache hit: 99.3%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] tool-failure-rate
- 7.4% tool failure rate (2/27).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $7.5230 is 27% above the last-3 median of $5.9413.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

