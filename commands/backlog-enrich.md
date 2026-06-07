---
description: Classify every triaged feature — dispatch loop:architect inline for each, write tags / needs_contract / needs_ux into FEAT frontmatter so /crew:orchestrate-slice routes the full ladder.
---

# Backlog Enrich

Sweeps `.claude/artifacts/loop/backlog/triaged/FEAT-*.md` (or the
configured backlog root) and, for every entry missing classification
fields, dispatches `loop:architect` from the current session, parses
the response, and writes `tags` + `needs_contract` + `needs_ux` into
the FEAT frontmatter.

Why this matters: `/crew:orchestrate-slice` reads those fields to
decide which specialists fire. Without them the ladder falls back to
AC-text heuristics and silently skips architect + uxdesigner.

Note: `stack` and `surface` are no longer FEAT-level fields. Project-level
stack identity now lives in `scripts/presets/*.json` (consumed by
`node scripts/loop.mjs resolve-skills`). Builder-variant routing is driven
from preset skill activation, not per-FEAT classification.

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

## Pass 2: contracts pre-population

Runs after pass 1 has written `needs_contract` into FEAT frontmatter for
every triaged entry. Pass 2 is independent — pass 1 must complete first so
`needs_contract` is set before this sweep reads it.

Steps:

1. **Glob the same triaged FEAT set** used in pass 1:
   `.claude/artifacts/loop/backlog/triaged/FEAT-*.md`.
2. **Filter to contract-needing FEATs.** Read `needs_contract` from each
   FEAT's frontmatter. Skip the FEAT if `needs_contract: false` or the field
   is absent.
3. **Check artifact existence.** For each remaining FEAT, check whether
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` already exists
   (the path returned by `getContractsPath` from
   `src/scripts/lib/contracts-artifact.mts` — that helper is the single
   source of truth for path resolution). If present, skip (idempotence —
   existing artifact is left untouched).
4. **Dispatch `crew:architect` inline.** For each missing artifact, dispatch
   `crew:architect` via the Agent tool using the canonical prompt at
   `${CLAUDE_PLUGIN_ROOT}/templates/contracts-architect-prompt.md` (plugin-root
   absolute path — consumer repos do not ship `templates/`). Parallel dispatches
   are allowed for batches of ≤5; above that, dispatch sequentially to avoid
   rate limits. If the template cannot be read, STOP and surface the error —
   do NOT fall back to ad-hoc sections (silent fallback masks plugin install
   drift).
5. **Validate and write.** Parse each response. If the response is empty OR
   does not contain all four required section headers
   (`## TypeScript Interfaces`, `## API Contracts`, `## Event Schemas`,
   `## Data Contracts`), log:

   ```
   WARNING: contracts artifact for <FEAT-ID> not written — architect response
   empty/malformed. Re-run /loop:backlog-enrich or rely on
   /crew:orchestrate-slice Step 1 retry.
   ```

   and continue without writing a partial file (fail-open per FEAT-049
   lesson). On a well-formed response: `mkdir -p .claude/artifacts/crew/designs/`
   then write the artifact via the Write tool (new file — Write, not Edit).

6. **Report.** Print:
   `Contracts written: <count> / Already present: <count> / Skipped (not needed): <count> / Failed: <count>`.

## Pass independence

Pass 1 (tag classification) and pass 2 (contracts pre-population) share no
state beyond `needs_contract` written by pass 1. An operator may:

- Re-run the full slash flow safely: pass 1 skips already-tagged FEATs (step
  2 filter); pass 2 skips already-present artifacts (step 3 check).
- Run only pass 2 after pass 1 has already classified: pass 1 becomes a
  no-op; pass 2 runs fresh against the `needs_contract: true` entries.
- Run only pass 1 to classify without triggering architect contract dispatch:
  stop after step 6 of pass 1 and do not proceed to pass 2.

This independence satisfies AC-8c — the operator can invoke either pass alone.

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

One `loop:architect` dispatch per unclassified FEAT (pass 1). Run on small
batches (≤10) or check cost-cap first. Each dispatch reads the FEAT file and
emits ~3 lines of structured output. Pass 2 adds one additional `crew:architect`
dispatch per `needs_contract: true` FEAT whose contracts artifact is missing;
each dispatch reads the full FEAT and emits a multi-section markdown document.

## Skip dispatch

The CLI accepts `--no-classify` to short-circuit (audit log only).
The slash flow has no skip — simply don't invoke it.
