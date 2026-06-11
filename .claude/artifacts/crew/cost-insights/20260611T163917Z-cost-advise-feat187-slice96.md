---
feature: FEAT-187
---
# Cost Advisor

## Performance Grade: C

Target slice: **FEAT187 SLICE96**
Cost: $31.4775 · duration 27.4 min · cache hit 94.9% · grade avg -

## Baseline (last 9 slices)
- median $: $17.25
- p75 $: $19.89
- median cache hit: 99.3%
- median Opus share: 100.0%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 94.9% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 4 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $31.4775 is 69% above the last-3 median of $18.6546.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

