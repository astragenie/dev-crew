---
feature: FEAT-272
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT272 SLICE172**
Cost: $503.3190 · duration 26095.4 min · cache hit 99% · grade avg -

## Baseline (last 9 slices)
- median $: $477.65
- p75 $: $486.73
- median cache hit: 99.2%
- median Opus share: 36.6%

## Per-slice findings
### [HIGH] file-rereads
- 22 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 127 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 38 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 5.7:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [HIGH] compaction-cascade
- 38 compactions + 127 subagent dispatches — context overflow driven by excessive dispatching.
- **Suggested action:** Each subagent cold-starts the cache; the lead's context grows with each handoff read. Target ≤3 dispatches per slice. Bundle review + validation when scope is small. Write checkpoint handoffs at ≥3 compactions instead of dispatching more agents.

