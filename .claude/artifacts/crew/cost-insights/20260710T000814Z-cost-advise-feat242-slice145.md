---
feature: FEAT-242
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT242 SLICE145**
Cost: $5.6964 · duration 31.7 min · cache hit 97.2% · grade avg -

## Baseline (last 9 slices)
- median $: $220.75
- p75 $: $2978.03
- median cache hit: 98.6%
- median Opus share: 95.1%

## Per-slice findings
### [MEDIUM] opus-overuse
- Opus accounts for 51.5% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] large-tool-output
- 90th-percentile tool result is 4,484 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] tool-failure-rate
- 15.6% tool failure rate (5/32).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.1% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

