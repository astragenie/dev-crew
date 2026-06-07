---
phase: "3"
feature: FEAT-072
---
# Cost Advisor

## Performance Grade: D

Target slice: **PHASE3 FEAT072 SLICE73**
Cost: $0.9480 · duration 12.2 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $12.07
- p75 $: $23.59
- median cache hit: 98.7%
- median Opus share: 100.0%

## Per-slice findings
### [LOW] tool-failure-rate
- 9.1% tool failure rate (1/11).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 8.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

