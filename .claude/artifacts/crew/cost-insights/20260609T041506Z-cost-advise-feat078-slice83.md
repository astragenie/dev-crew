---
feature: FEAT-078
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT078 SLICE83**
Cost: $16.0366 · duration 18.4 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $89.14
- p75 $: $96.74
- median cache hit: 98.1%
- median Opus share: 95.8%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 90.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 21.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.8% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

