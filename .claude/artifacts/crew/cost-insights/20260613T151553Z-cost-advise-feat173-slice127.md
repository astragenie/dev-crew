---
feature: FEAT-173
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT173 SLICE127**
Cost: $10.7619 · duration 26.0 min · cache hit 98.1% · grade avg -

## Baseline (last 9 slices)
- median $: $10.59
- p75 $: $142.78
- median cache hit: 97.3%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] file-rereads
- 13 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 24 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.3:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

