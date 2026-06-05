---
description: Classify every triaged feature — dispatch loop:architect to write tags / needs_contract / needs_ux frontmatter so orchestrate-slice routes the full ladder.
---

# Backlog Enrich

Sweeps `docs/backlog/triaged/*.md` and for each entry missing
classification fields:

1. Reads body + frontmatter.
2. Filters to unclassified entries — no `tags`, no `needs_contract`,
   no `needs_ux` set.
3. Dispatches `loop:architect` with the canonical classify prompt
   (constrained key:value block — `tags`, `needs_contract`, `needs_ux`).
4. Parses the response via `lib/classify-parser.mts`. Unknown tag
   tokens drop; vocabulary is `api-change | storage | workflow | ux |
   auth | infra | test | docs | refactor`.
5. Writes the resolved fields back to FEAT frontmatter via
   `updateFeatureFrontmatter`. Skips writes when nothing parsed.

Already-tagged entries are left untouched. Idempotent — re-running
only hits new triaged FEATs.

Why this matters: `/crew:orchestrate-slice` reads `frontmatter.tags`,
`needs_contract`, `needs_ux` from the slice / parent FEAT to decide
which specialists fire. Without these fields the ladder falls back to
AC-text heuristics and silently skips architect + uxdesigner for CLI
repos whose ACs lack UI vocabulary.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog enrich \
  --repo "$PWD"
```

Returns JSON: `{ enriched: <count>, alreadyTagged: <count>, failed: <count> }`.

## Cost note

One `loop:architect` dispatch per unclassified FEAT. Audit log:
`.claude/artifacts/loop/auto-dispatch.jsonl`. Check cost-cap before
running on a large backlog.

## Skip dispatch

Pass `--no-classify` to short-circuit — useful for dry-run audits or
when an upstream classifier already wrote the fields.

## Auto-invocation

Not currently auto-invoked by the autonomous loop. Run manually after
`/loop:backlog triage` (or after bulk import) so newly triaged FEATs
carry the tags `/crew:orchestrate-slice` needs.
