---
description: List backlog entries across all states with optional filters.
---

# Backlog List

Walks `docs/backlog/{pending,triaged,in-progress,done}/` and returns one entry
per FEAT file, sorted by numeric id.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" backlog list \
  --repo "$PWD" \
  [--status pending|triaged|in-progress|done] \
  [--priority P0|P1|P2|P3] \
  [--category feature|bugfix|ops|tech-debt] \
  [--target-release vX.Y.Z]
```

Returns JSON: `{ count, entries: [{ id, state, priority, category,
target_release, created, updated, derived_from, slices, filePath }, ...] }`.

Common patterns:

```bash
# Top-priority untriaged work
node ... backlog list --repo "$PWD" --status pending --priority P0

# Everything slated for the next release
node ... backlog list --repo "$PWD" --target-release v1.1.0

# Features derived from a specific spec (filter on derived_from manually in jq)
node ... backlog list --repo "$PWD" | jq '.entries[] | select(.derived_from == "SPEC-001")'
```
