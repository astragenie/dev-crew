---
feature: FEAT-049
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT049 SLICE50**
Cost: $57.7652 · duration 29.1 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $3.48
- p75 $: $3.80
- median cache hit: 98.7%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 5 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [LOW] tool-failure-rate
- 6.1% tool failure rate (3/49).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

