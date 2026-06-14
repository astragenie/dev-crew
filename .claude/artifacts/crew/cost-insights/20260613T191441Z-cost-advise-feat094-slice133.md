---
feature: FEAT-094
---
# Cost Advisor

## Performance Grade: D

Target slice: **FEAT094 SLICE133**
Cost: $3.1041 · duration 26.0 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $9.89
- p75 $: $10.38
- median cache hit: 97.9%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] file-rereads
- 3 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [LOW] tool-failure-rate
- 9.4% tool failure rate (3/32).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 8.7:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

