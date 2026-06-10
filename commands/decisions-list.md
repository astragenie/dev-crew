---
description: List retrospective decisions captured from grade files — DEC-NNN entries with status, originating slice, supersession links.
---

# Decisions List

Walks `docs/decisions/*.md` and returns one entry per `DEC-NNN.md` file
with frontmatter parsed.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions list \
  --repo "$PWD" \
  [--status accepted|superseded|reverted]
```

Returns:

```json
{
  "count": 7,
  "decisions": [
    {
      "id": "DEC-001",
      "title": "Server-side pagination for ingestion jobs",
      "status": "accepted",
      "introduced_by_slice": "SLICE-52",
      "introduced_at": "2026-05-20",
      "superseded_by": null,
      "filePath": "docs/decisions/DEC-001.md"
    }
  ]
}
```

Filtering with `--status` is exact-match on the frontmatter field.

## Distinguishing decision types

- `docs/decisions/DEC-NNN.md` — **retrospective** decisions, captured during
  slice work via grade-write extraction
- `docs/specs/SPEC-NNN.md` with `type: adr` — **forward-looking** decisions
  made before work begins

Both are valid; they're separate stores intentionally. Use `decisions list`
for retrospective ADRs and `spec list --type adr` for forward-looking ones.
