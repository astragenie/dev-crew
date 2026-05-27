# Cost Advisor

Target slice: **fix cost-alert-loader reads wrong files**
Cost: $40.3078 · duration 7.1 min · cache hit 99.4% · grade avg -

## Baseline (last 2 slices)
- median $: $173.36
- p75 $: $187.72
- median cache hit: 99.0%
- median Opus share: 89.7%

## Per-slice findings
### [HIGH] opus-overuse
- Opus accounts for 93.2% of spend — Opus is ~5x Sonnet on every token category.
- **Suggested action:** Switch routine slices to Sonnet via /model. Reserve Opus for design, ambiguous problem framing, or hard refactors.

### [LOW] file-rereads
- 3 redundant Read calls of files already loaded this session.
- **Suggested action:** Trust prior Read results unless the file was edited. Each redundant Read injects fresh tool output that busts the cache.

### [LOW] large-tool-output
- 90th-percentile tool result is 5,045 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] non-repo-dominant
- Only 27.1% of spend ($10.91 of $40.31) came from the repo-derived session. Bookkeeping is misaligned with where work actually happened.
- **Suggested action:** Either work directly inside the repo's own Claude session, or move the work to its real home. Cross-repo work hides accountability and inflates the next session's context.

### [LOW] many-sources
- Slice spend spread across 4 different Claude sessions. Hard to reason about; cache reuse is fragmented.
- **Suggested action:** Scope sessions per slice. Open one Claude Code session in the target repo and stay there until the slice closes.

