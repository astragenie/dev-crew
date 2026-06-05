---
feature: FEAT-046
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT046 SLICE49**
Cost: $3.5838 · duration 38.2 min · cache hit 98.7% · grade avg -

## Baseline (last 9 slices)
- median $: $2.85
- p75 $: $3.48
- median cache hit: 98.7%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

