---
feature: FEAT-001
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT001 SLICE01**
Cost: $2.2625 · duration 12.7 min · cache hit 99.4% · grade avg -

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 7,739 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] compaction
- 1 compaction/meta event(s) — context was summarised mid-slice.
- **Suggested action:** Slice ran past the context window. Checkpoint to a handoff artifact earlier and split the work.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

