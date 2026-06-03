# Cost Advisor

## Performance Grade: B

Target slice: **FEAT-006 SLICE-B — plan-mode conditional gate — SHIPPED**
Cost: $14.5306 · duration 25.1 min · cache hit 97.9% · grade avg -

## Baseline (last 9 slices)
- median $: $3.43
- p75 $: $4.14
- median cache hit: 99.7%
- median Opus share: 0.0%

## Per-slice findings
### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] non-repo-dominant
- Only 23.6% of spend ($3.43 of $14.53) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

## Cross-slice trends
### [HIGH] cost-regression
- Current slice cost $14.5306 is 324% above the last-3 median of $3.4269.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

