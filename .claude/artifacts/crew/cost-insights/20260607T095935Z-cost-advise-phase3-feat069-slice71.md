---
phase: "3"
feature: FEAT-069
---
# Cost Advisor

## Performance Grade: B

Target slice: **PHASE3 FEAT069 SLICE71**
Cost: $1.4132 · duration 20.2 min · cache hit 98.6% · grade avg -

## Baseline (last 9 slices)
- median $: $12.46
- p75 $: $30.58
- median cache hit: 99.7%
- median Opus share: 100.0%

## Per-slice findings
### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 8.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

