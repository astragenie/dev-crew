---
feature: FEAT-001
---
# Cost Advisor

## Performance Grade: A

Target slice: **FEAT001 SLICE02**
Cost: $2.3664 · duration 15.9 min · cache hit 99.6% · grade avg -

## Baseline (last 1 slices)
- median $: $2.26
- p75 $: $2.26
- median cache hit: 99.4%
- median Opus share: 0.0%

## Per-slice findings
### [LOW] large-tool-output
- 90th-percentile tool result is 4,864 bytes.
- **Suggested action:** Prefer Grep with head_limit, Bash | head -N, or narrower file Read offsets over broad output. Big tool results inflate cache_create.

### [MEDIUM] xrepo-attribution
- Cost was auto-attributed to C--work-mega-runner-plugin (not the repo-derived dir). Single-source view may under-count if work spanned multiple sessions.
- **Suggested action:** Re-run cost-slice with --aggregate-all to capture cross-repo spend, or pass --source-project explicitly if you know the right slug.

