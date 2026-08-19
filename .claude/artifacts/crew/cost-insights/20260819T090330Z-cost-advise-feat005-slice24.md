---
feature: FEAT-005
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT005 SLICE24**
Cost: $26.4347 · duration 111.8 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $14.64
- p75 $: $20.70
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 8 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 10.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $26.4347 is 81% above the last-3 median of $14.6441.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

