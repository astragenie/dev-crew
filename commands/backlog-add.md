---
description: Append a new feature to docs/backlog/pending/ with auto-assigned FEAT-NNN id.
---

# Backlog Add

Creates a new `FEAT-NNN.md` under `docs/backlog/pending/` with frontmatter
matching the canonical template. The next FEAT id is computed across all
state directories (no gaps reused).

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" \
  --title "Bulk delete memories from dashboard" \
  [--priority P1] [--category feature] [--target-release v1.1.0] \
  [--body "Optional full description"]
```

Or positional title (everything after the subcommand becomes the title):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" -- Bulk delete memories from dashboard
```

Pre-fill from a GitHub Issue (requires `gh` CLI authenticated):

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" backlog add \
  --repo "$PWD" \
  --from-issue https://github.com/owner/repo/issues/42
```

When `--from-issue` is used the command calls `gh issue view <url> --json
title,body,number,url` and pre-fills:

- `title` — from the issue title (overridden by `--title` if also passed)
- `body` — from the issue body (overridden by `--body` if also passed)
- `github_issue` — the issue number, stored in FEAT frontmatter
- `github_url` — the canonical issue URL, stored in FEAT frontmatter

If `gh` is not installed, not authenticated, or the issue is private/
inaccessible, the command exits with a clear error and does **not** create
a partial FEAT file.

Returned JSON includes the new id, file path, and resolved frontmatter.

When --priority / --category / --target-release are omitted, the entry lands
in `pending/` with those fields null. The PM agent will fill them on the
next `/loop:triage` run (also invoked automatically by the Cross-Slice
Continuation HARD RULE when `pending/` is non-empty).
