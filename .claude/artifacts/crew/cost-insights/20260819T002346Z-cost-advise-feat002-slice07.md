---
feature: FEAT-002
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT002 SLICE07**
Cost: $11.4980 · duration 91.9 min · cache hit 99.4% · grade avg -

## Baseline (last 6 slices)
- median $: $2.63
- p75 $: $3.05
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $11.4980 is 167% above the last-3 median of $4.3058.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

