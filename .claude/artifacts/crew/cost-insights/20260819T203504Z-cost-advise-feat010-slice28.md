---
feature: FEAT-010
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT010 SLICE28**
Cost: $8.2124 · duration 19.1 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $26.43
- p75 $: $36.14
- median cache hit: 99.2%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] tool-failure-rate
- 6.5% tool failure rate (3/46).
- **Suggested action:** Tool failures are pure waste. Plan the call shape (paths, flags, JSON schemas) before invoking; check pwd / file existence first.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 25.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [MEDIUM] non-repo-dominant
- Only 0.0% of spend ($0.00 of $8.21) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

### [LOW] many-sources
- Slice spend spread across 3 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $8.2124 is 134% above the last-3 median of $3.5034.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

