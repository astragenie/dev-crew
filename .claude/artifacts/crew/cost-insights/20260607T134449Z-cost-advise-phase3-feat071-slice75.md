---
phase: "3"
feature: FEAT-071
---
# Cost Advisor

## Performance Grade: C

Target slice: **PHASE3 FEAT071 SLICE75**
Cost: $48.9230 · duration 32.1 min · cache hit 98.6% · grade avg -

## Baseline (last 9 slices)
- median $: $6.10
- p75 $: $12.46
- median cache hit: 98.7%
- median Opus share: 15.7%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 96.7% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 6 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $48.9230 is 5061% above the last-3 median of $0.9480.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

