# Cost Advisor

## Performance Grade: D

Target slice: **SLICE-83**
Cost: $41.3887 · duration 18.4 min · cache hit 99.6% · grade avg -

## Baseline (last 9 slices)
- median $: $89.14
- p75 $: $96.74
- median cache hit: 98.1%
- median Opus share: 95.7%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 96.1% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] subagent-overuse
- 9 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [LOW] preamble
- 4 assistant turns before the first tool call.
- **Suggested action:** Long narration before action wastes output tokens. Skip narration on routine slices; act first, summarise after.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.7% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

