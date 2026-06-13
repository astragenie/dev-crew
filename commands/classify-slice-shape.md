---
name: classify-slice-shape
description: Classify a slice's changed-file set into an inline-friendly shape.
auto_execute_steps: false
---

# Classify Slice Shape

Returns a shape tag describing what kind of edit a slice contains. The orchestrator uses the result to decide whether the inline path is appropriate.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" classify-slice-shape \
  --repo "$PWD" \
  --files "a.mts,b.md"
```

Returns JSON: `{ "shape": "...", "rationale": "..." }`.

Shapes: `doc-update`, `config-tweak`, `single-module-edit`, `test-only`, `none`.

See `docs/sop/inline-criteria.md` for the full rule set and the public-surface guard list.
