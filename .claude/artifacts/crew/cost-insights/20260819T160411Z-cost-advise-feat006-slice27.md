---
feature: FEAT-006
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT006 SLICE27**
Cost: $55.9133 · duration 418.0 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $26.43
- p75 $: $35.81
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
- Only 0.0% of spend ($0.00 of $55.91) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

