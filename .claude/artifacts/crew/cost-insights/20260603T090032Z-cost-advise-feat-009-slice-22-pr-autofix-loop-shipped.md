# Cost Advisor

## Performance Grade: B

Target slice: **SLICE-22**
Cost: $18.7792 · duration 16.8 min · cache hit 97% · grade avg -

## Baseline (last 9 slices)
- median $: $9.55
- p75 $: $11.17
- median cache hit: 99.5%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] many-sources
- Slice spend spread across 3 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 0 → 1 → 2. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $18.7792 is 112% above the last-3 median of $8.8674.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

