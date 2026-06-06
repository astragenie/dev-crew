# Cost Advisor

## Performance Grade: C

Target slice: **SLICE-54**
Cost: $85.3325 · duration 32.4 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $36.96
- p75 $: $62.65
- median cache hit: 99.6%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] file-rereads
- 7 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [MEDIUM] subagent-overuse
- 6 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 4 → 5 → 6. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $85.3325 is 36% above the last-3 median of $62.6471.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

