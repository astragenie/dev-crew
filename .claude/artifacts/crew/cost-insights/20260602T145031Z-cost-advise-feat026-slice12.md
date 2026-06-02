---
feature: FEAT-026
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT026 SLICE12**
Cost: $15.7810 · duration 11.5 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $5.71
- p75 $: $75.91
- median cache hit: 99.3%
- median Opus share: 83.2%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] file-rereads
- 5 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $15.7810 is 239% above the last-3 median of $4.6533.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 83.2% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

