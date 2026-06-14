---
feature: FEAT-102
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT102 SLICE123**
Cost: $4.5762 · duration 13.3 min · cache hit 93.6% · grade avg -

## Baseline (last 9 slices)
- median $: $5.75
- p75 $: $142.78
- median cache hit: 97.9%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 93.6% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.3:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

