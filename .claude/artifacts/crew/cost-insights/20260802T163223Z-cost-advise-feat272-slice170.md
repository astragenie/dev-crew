---
feature: FEAT-272
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT272 SLICE170**
Cost: $477.6508 · duration 25991.2 min · cache hit 99.2% · grade avg -

## Baseline (last 9 slices)
- median $: $466.28
- p75 $: $471.63
- median cache hit: 99.2%
- median Opus share: 37.5%

## Per-slice findings
### [HIGH] file-rereads
- 22 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 122 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 33 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 5.6:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [HIGH] compaction-cascade
- 33 compactions + 122 subagent dispatches — context overflow driven by excessive dispatching.
- **Suggested action:** Each subagent cold-starts the cache; the lead's context grows with each handoff read. Target ≤3 dispatches per slice. Bundle review + validation when scope is small. Write checkpoint handoffs at ≥3 compactions instead of dispatching more agents.

## Cross-slice trends
### [MEDIUM] compaction-drift
- Compaction count has increased across the last 3 slices: 31 → 32 → 33. Context window pressure is growing.
- **Suggested action:** Split work into smaller slices and write checkpoint handoffs earlier. If compaction hit once, treat it as a budget warning and wrap up that slice.

### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 116 → 120 → 122. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

