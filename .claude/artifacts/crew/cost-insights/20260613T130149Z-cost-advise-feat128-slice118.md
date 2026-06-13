---
feature: FEAT-128
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT128 SLICE118**
Cost: $5.7481 · duration 57.6 min · cache hit 97.9% · grade avg -

## Baseline (last 9 slices)
- median $: $11.62
- p75 $: $142.78
- median cache hit: 98.5%
- median Opus share: 84.8%

## Per-slice findings
### [MEDIUM] file-rereads
- 6 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 23.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 84.8% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

