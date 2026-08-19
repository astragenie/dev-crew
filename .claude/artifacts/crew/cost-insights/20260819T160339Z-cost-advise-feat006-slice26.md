---
feature: FEAT-006
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT006 SLICE26**
Cost: $55.5842 · duration 417.5 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $14.64
- p75 $: $26.43
- median cache hit: 99.8%
- median Opus share: 0.0%

## Per-slice findings
### [HIGH] subagent-overuse
- 17 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 6 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] non-repo-dominant
- Only 0.0% of spend ($0.00 of $55.58) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

## Cross-slice trends
### [MEDIUM] compaction-drift
- Compaction count has increased across the last 3 slices: 0 → 2 → 6. Context window pressure is growing.
- **Suggested action:** Split work into smaller slices and write checkpoint handoffs earlier. If compaction hit once, treat it as a budget warning and wrap up that slice.

### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 0 → 6 → 17. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $55.5842 is 55% above the last-3 median of $35.8073.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

