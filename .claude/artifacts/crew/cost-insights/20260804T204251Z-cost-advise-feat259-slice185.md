---
feature: FEAT-259
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT259 SLICE185**
Cost: $5.5606 · duration 14.4 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $9.40
- p75 $: $20.70
- median cache hit: 99.5%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

