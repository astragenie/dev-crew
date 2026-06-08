# Cost Advisor

## Performance Grade: D

Target slice: **cortex: add Phase 1 milestone to all FEATs**
Cost: $333.9414 · duration 70.2 min · cache hit 98.9% · grade avg -

## Baseline (last 9 slices)
- median $: $38.82
- p75 $: $52.18
- median cache hit: 98.3%
- median Opus share: 87.8%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 96.7% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [HIGH] file-rereads
- 24 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [LOW] subagent-overuse
- 3 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [HIGH] compaction
- 12 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 4.3:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

### [MEDIUM] non-repo-dominant
- Only 26.7% of spend ($89.17 of $333.94) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

### [LOW] many-sources
- Slice spend spread across 3 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

## Cross-slice trends
### [MEDIUM] compaction-drift
- Compaction count has increased across the last 3 slices: 0 → 2 → 12. Context window pressure is growing.
- **Suggested action:** Split work into smaller slices and write checkpoint handoffs earlier. If compaction hit once, treat it as a budget warning and wrap up that slice.

### [HIGH] cost-regression
- Current slice cost $333.9414 is 275% above the last-3 median of $89.1408.
- **Suggested action:** Audit what drove the spike: Opus usage, subagent cold-starts, cache busts, or long exploration loops. Mandate Sonnet-default and a written plan before the next similar slice.

### [MEDIUM] trend-opus
- Median Opus $ share is 87.8% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

