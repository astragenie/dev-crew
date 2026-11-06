---
feature: FEAT-033
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT033 SLICE46**
Cost: $26.3932 · duration 14.0 min · cache hit 99.4% · grade avg -

## Baseline (last 9 slices)
- median $: $4.16
- p75 $: $4.89
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] subagent-overuse
- 5 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [LOW] preamble
- 6 assistant turns before the first tool call.
- **Suggested action:** Long narration before action wastes output tokens. Skip narration on routine slices; act first, summarise after.

### [HIGH] exploration-heavy
- Exploration:execution tool ratio is 28.0:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [HIGH] many-sources
- Slice spend spread across 5 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 1 → 4 → 5. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $26.3932 is 217% above the last-3 median of $8.3366.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

