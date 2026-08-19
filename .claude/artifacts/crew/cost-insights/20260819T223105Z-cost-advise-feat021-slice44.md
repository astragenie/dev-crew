---
feature: FEAT-021
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT021 SLICE44**
Cost: $3.0032 · duration 12.6 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $4.16
- p75 $: $4.97
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 0 → 1 → 2. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

