---
phase: "2"
feature: FEAT-014
---
# Cost Advisor

## Performance Grade: A

Target slice: **PHASE2 FEAT014 SLICE09**
Cost: $4.2488 · duration 8.9 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $23.39
- p75 $: $75.91
- median cache hit: 99.4%
- median Opus share: 22.5%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] large-tool-output
- 90th-percentile tool result is 5,170 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

