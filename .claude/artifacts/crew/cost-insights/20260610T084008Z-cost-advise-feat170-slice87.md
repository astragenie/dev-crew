---
feature: FEAT-170
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT170 SLICE87**
Cost: $43.4894 · duration 49.1 min · cache hit 98.5% · grade avg -

## Baseline (last 9 slices)
- median $: $15.31
- p75 $: $41.39
- median cache hit: 98.9%
- median Opus share: 89.5%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 97.2% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 5 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 5.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $43.4894 is 184% above the last-3 median of $15.3126.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 89.5% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

