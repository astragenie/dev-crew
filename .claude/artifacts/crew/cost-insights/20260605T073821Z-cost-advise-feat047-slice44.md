---
feature: FEAT-047
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT047 SLICE44**
Cost: $6.6805 · duration 25.2 min · cache hit 96.7% · grade avg -

## Baseline (last 9 slices)
- median $: $1.33
- p75 $: $2.17
- median cache hit: 98.6%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] file-rereads
- 11 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] compaction
- 4 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [LOW] tool-failure-rate
- 5.7% tool failure rate (4/70).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $6.6805 is 153% above the last-3 median of $2.6456.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

