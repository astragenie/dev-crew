---
description: Promote a backlog feature into an engineering slice — moves the feature to in-progress/, creates the slice file under slicesRoot/pending/, and cross-links them.
---

# Slice From Feature

Bridges Tier 2 (backlog) and Tier 3 (engineering slices) per the Cross-Slice
Continuation HARD RULE. Atomic operation that:

1. Looks up `FEAT-NNN` across `docs/backlog/{pending,triaged,in-progress,done}/`.
2. Moves the feature file to `docs/backlog/in-progress/` (if not already
   there).
3. Allocates the next `SLICE-NN` id by scanning every `SLICE_NN_*.md` or
   `SLICE-NN-*.md` file under `<slicesRoot>` recursively (works whether
   the repo uses flat layout like LoopBrain's `04-implementation-slices/`
   or the nested `slices/{pending,active,completed}/` layout).
4. Writes the slice file at `<slicesRoot>/pending/SLICE_NN_<UPPER_SLUG>.md`
   with frontmatter referencing the parent feature, and a body seeded
   with sections matching `00-entry/SLICE_TEMPLATE.md`.
5. Cross-links: appends the slice id to the feature's `slices: [...]`
   frontmatter array (idempotent — won't add twice).

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" slice from-feature \
  --repo "$PWD" \
  --id FEAT-007
```

Or positional:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" slice from-feature \
  --repo "$PWD" -- FEAT-007
```

Returns:

```json
{
  "slice": {
    "id": "SLICE-12",
    "path": "docs/ai-loop/slices/pending/SLICE_12_AUDIT_LOG_SEARCH.md",
    "title": "Audit log search"
  },
  "feature": {
    "id": "FEAT-007",
    "path": "docs/backlog/in-progress/FEAT-007.md",
    "fromState": "triaged",
    "toState": "in-progress"
  }
}
```

## Workflow integration

The Cross-Slice Continuation HARD RULE invokes this automatically when
selecting the next work item from `docs/backlog/triaged/`. Manual invocation
is the right call when:

- You want to skip queue order and start a specific feature first.
- A feature in `pending/` needs immediate slicing without going through
  triage (set its frontmatter manually then call this).
- Reproducing an engineering plan from an external roadmap reference.

## Contracts pre-population (when needs_contract: true)

After the CLI subcommand returns (slice file created, FEAT moved to
`in-progress/`), the calling agent MUST run this pre-population check before
dispatching any downstream specialist (`crew:builder`, `crew:reviewer`, etc.):

1. **Read FEAT frontmatter** at the path returned by the CLI in
   `feature.path`.
2. **Check the flag.** If `needs_contract: false` or the field is absent,
   stop — no architect dispatch needed.
3. **Check artifact existence.** Look up
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` (the path resolved
   by `getContractsPath` from `src/scripts/lib/contracts-artifact.mts`). If
   the artifact is already present, skip — do nothing (idempotence: this
   trigger fires on ANY slice for the FEAT, not just SLICE-1; the check is
   artifact existence, not slice index).
4. **Dispatch `crew:architect` inline.** Use the Agent tool with the
   canonical prompt from `templates/contracts-architect-prompt.md`. Single
   dispatch — one FEAT, one artifact.
5. **Validate and write.** Parse the response. If the response is empty OR
   any of the four required section headers (`## TypeScript Interfaces`,
   `## API Contracts`, `## Event Schemas`, `## Data Contracts`) is missing,
   log:

   ```
   WARNING: contracts artifact for <FEAT-ID> not written — architect response
   empty/malformed. Re-run /loop:backlog-enrich or rely on
   /crew:orchestrate-slice Step 1 retry.
   ```

   and continue without writing a partial file (fail-open per FEAT-049
   lesson). On a well-formed response, write the artifact at
   `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` via the Write tool.
6. **Proceed.** Only after this check (whether artifact was written, was
   already present, or dispatch was skipped) proceed to downstream specialists.

## Slice file body

The generated slice file is a starter — fill in:

- **In scope** / **Out of scope** sections (the agent's bounds for this run)
- **Acceptance criteria** (testable, with evidence per `EVIDENCE_RULES.md`)
- **Reviewer ladder** (assign Reviewer A and Reviewer B)

The body inherits the feature's first non-heading paragraph as the
**Objective**. Tweak as needed.

## Closing a slice

When acceptance criteria PASS:

1. Update slice frontmatter `status: completed`.
2. Move the slice file from `<slicesRoot>/pending/` to
   `<slicesRoot>/completed/` (or wherever your slice layout puts done work).
3. Move the feature file from `docs/backlog/in-progress/` to
   `docs/backlog/done/` (manually via `git mv` or via a future
   `/loop:slice complete` command).
4. Run `/loop:spec status` to auto-roll parent SPEC to `satisfied`
   if all its features are done.
5. Write the Crew `final-synthesis` artifact.
