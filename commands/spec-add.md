---
name: spec-add
description: Create a new SPEC-NNN.md (PRD / user journey / SRE / research / ADR) under docs/specs/.
auto_execute_steps: false
---

# Spec Add

Creates a fresh spec file with frontmatter under `docs/specs/`. The next
SPEC-NNN id is computed across all existing specs (regardless of type).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" spec add \
  --repo "$PWD" \
  --type prd \
  --title "MemoryService v2 — multi-tenant + audio ingestion" \
  [--priority P0] [--target-release v2.0.0] \
  [--body "Optional full markdown body"]
```

`--type` must be one of: `prd`, `user-journey`, `sre`, `research`, `adr`,
`other`. The body is seeded from the matching template if `--body` is omitted.

Returns `{ id, filePath, frontmatter }`.

## After authoring

Once the spec body is fleshed out and reviewed:

1. Edit `status: draft` → `status: approved` in frontmatter (or via a future
   `/runner:spec approve` command).
2. Run `/runner:spec decompose --id SPEC-NNN --features "title1; title2"`
   to derive FEAT-NNN files in `docs/backlog/pending/` linked back to the spec.
