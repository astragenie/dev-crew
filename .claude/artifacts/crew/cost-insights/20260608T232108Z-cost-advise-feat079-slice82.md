---
feature: FEAT-079
---
# Cost Advisor

## Performance Grade: F

Target slice: **FEAT079 SLICE82**
Cost: $96.7364 · duration 25.0 min · cache hit 93.1% · grade avg -

## Baseline (last 9 slices)
- median $: $68.56
- p75 $: $96.44
- median cache hit: 98.1%
- median Opus share: 95.6%

## Per-slice findings
### [LOW] cache-busted
- Cache hit 93.1% is below the 95% amortisation sweet spot. Below 85% = cache rebuilds dominate cost.
- **Suggested action:** Front-load file reads in the first 1-2 turns then iterate; avoid interleaving big Bash output with code edits since fresh tool results invalidate the cache.

### [HIGH] opus-overuse
- Opus accounts for 95.8% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] file-rereads
- 3 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [MEDIUM] large-tool-output
- 90th-percentile tool result is 8,321 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [HIGH] subagent-overuse
- 22 subagent dispatches.
- **Suggested action:** Subagents cold-start with no cache reuse — each one re-derives session context. Reserve for genuinely independent parallel work.

### [MEDIUM] compaction
- 2 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] exploration-heavy
- Exploration:execution tool ratio is 6.5:1 (Reads/Greps/Bashes vs Edits/Writes).
- **Suggested action:** Lots of looking, little doing. After the second exploration pass, write the plan down and start editing; do not keep grepping. Prefer LSP for code-symbol lookups (see `docs/process/grep-guidance.md` in hero-crew); use Grep only for prose, configs, or regex hunts.

## Cross-slice trends
### [MEDIUM] trend-opus
- Median Opus $ share is 95.6% across recent slices.
- **Suggested action:** Default to Sonnet; promote to Opus only on slice-start when the problem is design-shaped.

