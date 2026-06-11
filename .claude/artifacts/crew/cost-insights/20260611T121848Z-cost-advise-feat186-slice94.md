---
feature: FEAT-186
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT186 SLICE94**
Cost: $18.6546 · duration 17.1 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $16.33
- p75 $: $21.73
- median cache hit: 99.0%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

