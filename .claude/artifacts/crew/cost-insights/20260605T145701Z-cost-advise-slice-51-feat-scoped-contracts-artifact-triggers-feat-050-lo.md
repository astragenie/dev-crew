# Cost Advisor

## Performance Grade: F

Target slice: **SLICE-51**
Cost: $104.4572 · duration 22.5 min · cache hit 99.6% · grade avg -

## Baseline (last 9 slices)
- median $: $3.80
- p75 $: $57.16
- median cache hit: 98.8%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] subagent-overuse
- 11 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 5 → 6 → 11. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $104.4572 is 81% above the last-3 median of $57.7652.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

