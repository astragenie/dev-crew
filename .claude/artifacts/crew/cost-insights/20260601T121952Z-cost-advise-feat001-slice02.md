---
feature: FEAT-001
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT001 SLICE02**
Cost: $6.7592 · duration 5282.7 min · cache hit 90.3% · grade avg -

## Baseline (last 9 slices)
- median $: $1.03
- p75 $: $51.82
- median cache hit: 99.0%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 90.3% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] opus-overuse
- Opus accounts for 96.7% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] large-tool-output
- 90th-percentile tool result is 58,835 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] compaction
- 3 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [LOW] tool-failure-rate
- 10.0% tool failure rate (1/10).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

