---
feature: FEAT-004
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT004 SLICE14**
Cost: $20.7022 · duration 183.2 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $2.22
- p75 $: $3.18
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] subagent-overuse
- 6 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $20.7022 is 11459% above the last-3 median of $0.1791.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

