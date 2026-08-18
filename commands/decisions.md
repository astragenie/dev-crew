---
name: decisions
description: Decision log operations — list, show, relevant lookup, supersede. Consolidates the four prior decisions-* skills (FEAT-277).
auto_execute_steps: false
---

# Decisions

Single command with subcommands. Replaces:

- `runner:decisions-list`      → `runner:decisions list`
- `runner:decisions-show`      → `runner:decisions show --id DEC-NNN`
- `runner:decisions-relevant`  → `runner:decisions relevant --files "<file1>,<file2>"`
- `runner:decisions-supersede` → `runner:decisions supersede --id DEC-OLD --by DEC-NEW`

## list

Walks `docs/decisions/*.md` (or `.claude/artifacts/loop/decisions/`) and returns all
decisions sorted newest first.

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
      "filePath": "..."
    }
  ]
}
```

Filtering with `--status` is exact-match on the frontmatter field.

## show

Print the full body + frontmatter of a single decision by id.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions show \
  --repo "$PWD" \
  --id DEC-001
```

Returns the parsed decision file: `{ id, title, status, introduced_by_slice,
introduced_at, superseded_by, filePath, frontmatter, body }`.

## relevant

Find decisions whose `affects_files` frontmatter matches any of the supplied
changed files. Match is literal path-suffix.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions relevant \
  --repo "$PWD" \
  --files "src/auth/middleware.cs,src/api/Controllers/AuthController.cs"
```

Returns:

```json
{
  "count": 2,
  "decisions": [
    {
      "id": "DEC-007",
      "title": "...",
      "status": "accepted",
      "introduced_by_slice": "SLICE-52",
      "filePath": "...",
      "hits": [
        { "decisionFile": "src/auth/middleware.cs", "changedFile": "src/auth/middleware.cs" }
      ]
    }
  ]
}
```

Reviewer workflow integration: none today. `decisions relevant` is a manual
CLI lookup only — `findRelevantDecisions` is not called from the reviewer
fanout (`post-builder-fanout.mts`), so reviewer/validator prompts carry no
decision context automatically. Run this subcommand by hand before a review
if you want prior-decision context for the changed files.

## supersede

Mark an existing decision as superseded by a newer one — updates both files atomically.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions supersede \
  --repo "$PWD" \
  --id DEC-005 \
  --by DEC-009
```

`--id` is the older decision being superseded. `--by` is the newer decision that
replaces it. Both files must already exist.

Returns `{ oldId, newId, alreadySuperseded }`. Idempotent — re-running with
the same args is a no-op.

Errors with exit 2 if `--id` or `--by` is missing.

## Distinguishing decision types

- `docs/decisions/DEC-NNN.md` or `.claude/artifacts/loop/decisions/DEC-NNN.md` —
  **retrospective** decisions, captured during slice work via grade-write extraction
- `docs/specs/SPEC-NNN.md` with `type: adr` — **forward-looking** decisions made
  before work begins

Both are valid; they are separate stores intentionally. Use `decisions list`
for retrospective ADRs and `spec list --type adr` for forward-looking ones.
