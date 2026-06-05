---
feature: FEAT-044
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT044 SLICE47**
Cost: $3.4753 · duration 38.1 min · cache hit 98.7% · grade avg -

## Baseline (last 9 slices)
- median $: $2.62
- p75 $: $2.85
- median cache hit: 98.6%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.3:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $3.4753 is 22% above the last-3 median of $2.8454.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

