---
feature: FEAT-039
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT039 SLICE37**
Cost: $18.3624 · duration 57.0 min · cache hit 98.5% · grade avg -

## Baseline (last 9 slices)
- median $: $22.98
- p75 $: $85.97
- median cache hit: 99.5%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] file-rereads
- 17 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 7 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 4 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

