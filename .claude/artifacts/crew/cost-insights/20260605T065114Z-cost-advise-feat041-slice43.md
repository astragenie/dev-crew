---
feature: FEAT-041
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT041 SLICE43**
Cost: $0.5217 · duration 1.1 min · cache hit 98.6% · grade avg -

## Baseline (last 9 slices)
- median $: $1.91
- p75 $: $17.04
- median cache hit: 98.2%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,537 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] tool-failure-rate
- 27.3% tool failure rate (3/11).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 10.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

