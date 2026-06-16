---
name: backlog-promote
description: Move a triaged feature into in-progress and create a linked slice.
auto_execute_steps: false
---

# Backlog Promote

Promotes a feature from `triaged/` to `in-progress/`:

1. Looks up FEAT-NNN across backlog state dirs.
2. Moves file from current state to `in-progress/`.
3. Updates `status: in-progress`, `updated: <today>`.

Note: linking to a slice file in `ai-loop/slices/pending/` is a separate
manual step in v0.1.3 — author the slice using
`docs/ai-loop/00-entry/SLICE_TEMPLATE.md`, reference the FEAT id in the
slice file, and edit the feature's `slices: [SLICE-NN]` frontmatter. v0.1.4
will add `/runner:slice from-feature FEAT-NNN` to automate this.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog promote \
  --repo "$PWD" \
  --id FEAT-007
```

Returns `{ id, moved: { from, to } }`.

## Integration with the Wiggin Loop

Promotion is what bridges Tier 2 (backlog) and Tier 3 (engineering slices).
The Cross-Slice Continuation HARD RULE may invoke this automatically when
selecting the next work item; for hand-driven sessions, call it before
beginning slice work so brief-me reflects the in-flight state correctly.
