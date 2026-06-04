---
phase: "2"
feature: FEAT-012
---
# Cost Advisor

## Performance Grade: D

Target slice: **PHASE2 FEAT012 SLICE38**
Cost: $6.7222 · duration 12.4 min · cache hit 93.8% · grade avg -

## Baseline (last 9 slices)
- median $: $28.79
- p75 $: $85.97
- median cache hit: 98.0%
- median Opus share: 54.3%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 93.8% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [MEDIUM] opus-overuse
- Opus accounts for 54.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] large-tool-output
- 90th-percentile tool result is 4,337 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] tool-failure-rate
- 12.1% tool failure rate (4/33).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 54.3% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

