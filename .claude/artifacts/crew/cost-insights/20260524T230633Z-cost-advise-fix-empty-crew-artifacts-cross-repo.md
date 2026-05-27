# Cost Advisor

Target slice: **Fix empty crew artifacts (cross-repo)**
Cost: $11.5112 · duration 5.8 min · cache hit 99.1% · grade avg -

## Baseline (last 4 slices)
- median $: $99.66
- p75 $: $187.72
- median cache hit: 99.5%
- median Opus share: 95.8%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 82.2% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] tool-failure-rate
- 9.1% tool failure rate (3/33).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 6.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.8% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

