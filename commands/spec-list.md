---
description: List specs with optional filters by status / type / priority / target_release.
---

# Spec List

Walks `docs/specs/*.md` and returns one entry per SPEC file, sorted by
numeric id.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" spec list \
  --repo "$PWD" \
  [--status draft|approved|decomposed|satisfied|archived] \
  [--type prd|user-journey|sre|research|adr|other] \
  [--priority P0|P1|P2|P3] \
  [--target-release vX.Y.Z]
```

Returns JSON: `{ count, specs: [{ id, type, status, priority,
target_release, title, derived_features, filePath }, ...] }`.

Common patterns:

```bash
# What specs need decomposition?
node ... spec list --repo "$PWD" --status approved

# All PRDs targeting v2.0
node ... spec list --repo "$PWD" --type prd --target-release v2.0.0
```
