---
description: Report satisfaction state across all specs (% of derived features done) and auto-roll status to satisfied where appropriate.
---

# Spec Status

Reads all specs + all backlog features, computes per-spec satisfaction
metrics:

- `total` — number of derived features
- `done` — number of those in `done/`
- `pct` — completion percentage
- `state` — `satisfied` (all done) | `in-progress` (some done) | `no-features` (not yet decomposed)
- `missing` — derived FEAT ids that have no matching file (drift indicator)

Side effect: any spec whose derived features are all done has its frontmatter
auto-rolled from `decomposed` to `satisfied`. Idempotent — safe to run
repeatedly.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" spec status \
  --repo "$PWD"
```

Returns:

```json
{
  "satisfaction": [
    { "id": "SPEC-001", "state": "satisfied", "total": 3, "done": 3, "pct": 100, "missing": [] },
    { "id": "SPEC-002", "state": "in-progress", "total": 5, "done": 2, "pct": 40, "missing": [] }
  ],
  "statusChanges": [
    { "id": "SPEC-001", "from": "decomposed", "to": "satisfied" }
  ]
}
```

## When to run

- Inside Cross-Slice Continuation — plugin invokes this each iteration so
  satisfied specs roll forward.
- Before release planning — confirms which specs ship in the next release.
- In brief-me — surfaces in-flight specs + percent complete.
