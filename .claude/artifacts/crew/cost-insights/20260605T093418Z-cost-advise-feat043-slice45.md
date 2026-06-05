---
feature: FEAT-043
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT043 SLICE45**
Cost: $2.6159 · duration 14.4 min · cache hit 99.1% · grade avg -

## Baseline (last 9 slices)
- median $: $1.91
- p75 $: $2.65
- median cache hit: 98.2%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] file-rereads
- 3 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 5.7:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

