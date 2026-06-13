---
feature: FEAT-182
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT182 SLICE126**
Cost: $10.3805 · duration 24.5 min · cache hit 98% · grade avg -

## Baseline (last 9 slices)
- median $: $9.89
- p75 $: $142.78
- median cache hit: 97.3%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] file-rereads
- 13 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 23 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.3:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 14 → 21 → 23. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

