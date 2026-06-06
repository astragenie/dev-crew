# Cost Advisor

## Performance Grade: F

Target slice: **SLICE-56**
Cost: $344.8525 · duration 40.8 min · cache hit 99.5% · grade avg -

## Baseline (last 9 slices)
- median $: $62.65
- p75 $: $82.54
- median cache hit: 99.7%
- median Opus share: 100.0%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 96.4% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] file-rereads
- 17 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [HIGH] subagent-overuse
- 32 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [LOW] preamble
- 5 assistant turns before the first tool call.
- **Suggested action:** Long narration before action wastes output tokens. Skip narration on routine slices; act first, summarise after.

### [MEDIUM] non-repo-dominant
- Only 23.9% of spend ($82.54 of $344.85) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

### [HIGH] many-sources
- Slice spend spread across 5 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

## Cross-slice trends
### [MEDIUM] subagent-creep
- Subagent dispatch count has grown across the last 3 slices: 5 → 6 → 32. Each cold-start re-derives session context.
- **Suggested action:** Bundle review + validation into a single subagent when scope is small. Reserve parallel dispatches for genuinely independent parallel work.

### [HIGH] cost-regression
- Current slice cost $344.8525 is 318% above the last-3 median of $82.5363.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 100.0% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

