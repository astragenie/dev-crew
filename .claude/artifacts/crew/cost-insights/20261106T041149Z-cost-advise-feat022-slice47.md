---
feature: FEAT-022
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT022 SLICE47**
Cost: $5.0713 · duration 16.8 min · cache hit 99.8% · grade avg -

## Baseline (last 9 slices)
- median $: $4.75
- p75 $: $6.64
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

