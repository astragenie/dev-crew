---
feature: FEAT-011
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT011 SLICE08**
Cost: $1.8860 · duration 9.7 min · cache hit 98.1% · grade avg -

## Baseline (last 9 slices)
- median $: $89.98
- p75 $: $529.90
- median cache hit: 98.0%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,287 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 13.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

