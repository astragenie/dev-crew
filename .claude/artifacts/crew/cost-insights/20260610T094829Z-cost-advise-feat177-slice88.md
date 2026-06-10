---
feature: FEAT-177
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT177 SLICE88**
Cost: $136.4872 · duration 117.5 min · cache hit 98.8% · grade avg -

## Baseline (last 9 slices)
- median $: $15.31
- p75 $: $41.39
- median cache hit: 98.9%
- median Opus share: 89.5%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 92.1% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] file-rereads
- 5 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 7 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] tool-failure-rate
- 10.2% tool failure rate (19/187).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $136.4872 is 196% above the last-3 median of $46.1498.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 89.5% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

