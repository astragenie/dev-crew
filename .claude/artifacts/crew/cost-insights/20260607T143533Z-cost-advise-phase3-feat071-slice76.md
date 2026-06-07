---
phase: "3"
feature: FEAT-071
---
# Cost Advisor

## Performance Grade: C

Target slice: **PHASE3 FEAT071 SLICE76**
Cost: $17.6208 · duration 47.2 min · cache hit 94.9% · grade avg -

## Baseline (last 9 slices)
- median $: $12.07
- p75 $: $48.64
- median cache hit: 98.7%
- median Opus share: 15.7%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 94.9% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] opus-overuse
- Opus accounts for 87.8% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] subagent-overuse
- 6 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

