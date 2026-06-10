---
feature: FEAT-083
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT083 SLICE89**
Cost: $10.3107 · duration 18.2 min · cache hit 97.8% · grade avg -

## Baseline (last 9 slices)
- median $: $16.04
- p75 $: $43.49
- median cache hit: 98.8%
- median Opus share: 90.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 90.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

