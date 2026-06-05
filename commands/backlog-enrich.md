---
description: Classify every triaged feature — dispatch loop:architect inline for each, write tags / needs_contract / needs_ux into FEAT frontmatter so /crew:orchestrate-slice routes the full ladder.
---

# Backlog Enrich

Sweeps `.claude/artifacts/loop/backlog/triaged/FEAT-*.md` (or the
configured backlog root) and, for every entry missing classification
fields, dispatches `loop:architect` from the current session, parses
the response, and writes `tags` + `needs_contract` + `needs_ux` into
the FEAT frontmatter.

Why this matters: `/crew:orchestrate-slice` reads those three fields
to decide which specialists fire. Without them the ladder falls back
to AC-text heuristics and silently skips architect + uxdesigner.

## Execution (Claude-driven, not CLI)

The Node CLI subcommand (`node scripts/loop.mjs backlog enrich`) only
writes pending-dispatch markers — it does NOT spawn subagents. See
`docs/code-conventions.md` and `auto-dispatch.mts` for the consumer
gap (tracked as a known followup). Use the slash flow below instead;
it dispatches inline and writes results synchronously.

Steps:

1. **List triaged FEATs.** Glob
   `.claude/artifacts/loop/backlog/triaged/FEAT-*.md` (or the path
   resolved via `loop.json::backlogRoot`). Read the frontmatter of
   each.
2. **Filter unclassified.** Skip entries where `tags` is non-empty
   OR `needs_contract` is set OR `needs_ux` is set. Already-tagged
   entries are left untouched.
3. **Dispatch `loop:architect` in parallel.** Send all classify
   requests in a single message containing one `Agent` tool call
   per unclassified FEAT. Prompt template per FEAT:

   ```
   Classify this feature for the orchestrate-slice router.
   Read <ABSOLUTE_PATH_TO_FEAT> for context. Respond with ONLY this
   key:value block — no preamble, no headings:
   tags: [<labels from: api-change, storage, workflow, ux, auth, infra, test, docs, refactor>]
   needs_contract: <true|false>
   needs_ux: <true|false>
   ```

4. **Parse responses.** For each architect response, extract the
   three fields tolerantly (ignore prose, headings, blank lines).
   Tags must be filtered to the known vocabulary; drop unknowns.
5. **Write frontmatter via `Edit`.** For each FEAT with at least
   one parsed field, edit the YAML frontmatter to insert / update
   `tags`, `needs_contract`, `needs_ux`. Preserve all other fields
   verbatim. If nothing parsed, skip the write.
6. **Report.** Print a one-line summary:
   `Enriched: <count> / Already tagged: <count> / Failed: <count>`.

## Idempotence

Re-running only hits FEATs that still lack tags. Already-classified
FEATs are filtered in step 2. Safe to run after every
`/loop:backlog-triage` sweep.

## CLI fallback (audit-only)

The CLI subcommand exists but its dispatch path writes markers to
`.claude/artifacts/loop/pending-dispatch/` without a consumer. Useful
only for audit-log trace via `.claude/artifacts/loop/auto-dispatch.jsonl`
when an outer harness is wired in future.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" backlog enrich --repo "$PWD"
```

Until the consumer ships, the CLI reports `Enriched: 0` even when
markers are written. Prefer the slash flow above.

## Cost note

One `loop:architect` dispatch per unclassified FEAT. Run on small
batches (≤10) or check cost-cap first. Each dispatch reads the FEAT
file and emits ~3 lines of structured output.

## Skip dispatch

The CLI accepts `--no-classify` to short-circuit (audit log only).
The slash flow has no skip — simply don't invoke it.
