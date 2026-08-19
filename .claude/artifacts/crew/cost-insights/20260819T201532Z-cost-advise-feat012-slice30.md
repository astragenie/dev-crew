---
feature: FEAT-012
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT012 SLICE30**
Cost: $3.5034 · duration 3.5 min · cache hit 99.3% · grade avg -

## Baseline (last 9 slices)
- median $: $26.43
- p75 $: $36.14
- median cache hit: 99.2%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 13.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [MEDIUM] non-repo-dominant
- Only 0.0% of spend ($0.00 of $3.50) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

