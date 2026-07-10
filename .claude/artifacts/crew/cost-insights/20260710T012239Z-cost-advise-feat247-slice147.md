---
feature: FEAT-247
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT242 SLICE146**
Cost: $9.7611 · duration 30.5 min · cache hit 97% · grade avg -

## Baseline (last 9 slices)
- median $: $36.12
- p75 $: $2978.03
- median cache hit: 98.5%
- median Opus share: 51.5%

## Per-slice findings
### [MEDIUM] opus-overuse
- Opus accounts for 66.8% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] tool-failure-rate
- 26.5% tool failure rate (9/34).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 6.8:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 51.5% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

