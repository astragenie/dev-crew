---
feature: FEAT-011
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT011 SLICE08**
Cost: $1.7478 · duration 9.4 min · cache hit 98% · grade avg -

## Baseline (last 9 slices)
- median $: $160.28
- p75 $: $529.90
- median cache hit: 97.5%
- median Opus share: 87.2%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,287 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 12.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $1.7478 is 159% above the last-3 median of $0.6755.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 87.2% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

