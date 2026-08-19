---
feature: FEAT-004
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT004 SLICE18**
Cost: $24.3534 · duration 196.2 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $3.02
- p75 $: $20.70
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

