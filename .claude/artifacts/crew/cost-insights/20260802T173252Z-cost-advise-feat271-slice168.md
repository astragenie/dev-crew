---
feature: FEAT-271
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT271 SLICE168**
Cost: $489.4562 · duration 26051.7 min · cache hit 99.1% · grade avg -

## Baseline (last 9 slices)
- median $: $473.01
- p75 $: $477.65
- median cache hit: 99.2%
- median Opus share: 37.0%

## Per-slice findings
### [HIGH] file-rereads
- 22 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 126 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 35 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 5.7:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [HIGH] compaction-cascade
- 35 compactions + 126 subagent dispatches — context overflow driven by excessive dispatching.
- **Suggested action:** Each subagent cold-starts the cache; the lead's context grows with each handoff read. Target ≤3 dispatches per slice. Bundle review + validation when scope is small. Write checkpoint handoffs at ≥3 compactions instead of dispatching more agents.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 122 → 125 → 126. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

