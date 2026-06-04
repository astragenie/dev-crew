---
feature: FEAT-032
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT032 SLICE34**
Cost: $23.2464 · duration 1.7 min · cache hit 99.9% · grade avg -

## Baseline (last 9 slices)
- median $: $6.15
- p75 $: $22.98
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 12.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

