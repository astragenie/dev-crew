---
phase: "2"
feature: FEAT-010
---
# Cost Advisor

## Performance Grade: F

Target slice: **PHASE2 FEAT010 SLICE36**
Cost: $2.6456 · duration 7.3 min · cache hit 94% · grade avg -

## Baseline (last 9 slices)
- median $: $1.33
- p75 $: $2.17
- median cache hit: 98.6%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 94% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [LOW] large-tool-output
- 90th-percentile tool result is 4,144 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] tool-failure-rate
- 25.0% tool failure rate (8/32).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 9.7:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $2.6456 is 98% above the last-3 median of $1.3332.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

