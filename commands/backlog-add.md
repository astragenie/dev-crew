---
description: Append a new feature to docs/backlog/pending/ with auto-assigned FEAT-NNN id.
---

# Backlog Add

Creates a new `FEAT-NNN.md` under `docs/backlog/pending/` with frontmatter
matching the canonical template. The next FEAT id is computed across all
state directories (no gaps reused).

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog add \
  --repo "$PWD" \
  --title "Bulk delete memories from dashboard" \
  [--priority P1] [--category feature] [--target-release v1.1.0] \
  [--body "Optional full description"]
```

Or positional title (everything after the subcommand becomes the title):

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog add \
  --repo "$PWD" -- Bulk delete memories from dashboard
```

Returned JSON includes the new id, file path, and resolved frontmatter.

When --priority / --category / --target-release are omitted, the entry lands
in `pending/` with those fields null. Triage will fill them via heuristic on
the next `/loop:backlog triage` run (which is also invoked
automatically by the Cross-Slice Continuation HARD RULE).
