---
feature: FEAT-168
---
# Cost Advisor

## Performance Grade: B

Target slice: **FEAT168 SLICE100**
Cost: $66.2607 · duration 11.2 min · cache hit 99.7% · grade avg -

## Baseline (last 9 slices)
- median $: $11.48
- p75 $: $17.22
- median cache hit: 99.4%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 100.0% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [MEDIUM] file-rereads
- 6 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $66.2607 is 536% above the last-3 median of $10.4223.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

