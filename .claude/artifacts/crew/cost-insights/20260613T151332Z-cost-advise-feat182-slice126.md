---
feature: FEAT-182
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT182 SLICE126**
Cost: $9.8894 · duration 23.6 min · cache hit 97.9% · grade avg -

## Baseline (last 9 slices)
- median $: $6.69
- p75 $: $142.78
- median cache hit: 97.3%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] file-rereads
- 13 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 21 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.2:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 9 → 14 → 21. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $9.8894 is 48% above the last-3 median of $6.6921.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

