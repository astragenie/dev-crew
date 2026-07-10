---
feature: FEAT-244
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT244 SLICE149**
Cost: $10.3036 · duration 42.7 min · cache hit 99.2% · grade avg -

## Baseline (last 9 slices)
- median $: $35.83
- p75 $: $2978.03
- median cache hit: 98.3%
- median Opus share: 51.5%

## Per-slice findings
### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [LOW] tool-failure-rate
- 6.5% tool failure rate (3/46).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 15.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 51.5% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

