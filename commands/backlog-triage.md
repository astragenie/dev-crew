---
description: Triage every pending feature — fill priority / category / target_release heuristically and move to triaged/.
---

# Backlog Triage

Iterates `docs/backlog/pending/*.md` and for each entry:

1. Reads body + frontmatter.
2. Fills missing fields via deterministic heuristics:
   - **category**: regex on body content — `bug|broken|regress` → `bugfix`,
     `deploy|terraform|infra` → `ops`, `refactor|cleanup|tech-debt` →
     `tech-debt`, otherwise `feature`.
   - **priority**: `urgent|critical|p0|incident|outage` → `P0`,
     `soon|deadline|due` → `P1`, otherwise `P2`.
   - **target_release**: not inferred without repo knowledge — left for
     PM / agent to set.
3. Sets `status: triaged` and `updated: <today>`.
4. Adds a `triage_notes` line capturing the inferred decisions so the call
   can be audited.
5. `git mv` (logically) the file from `pending/` to `triaged/`.

Pre-existing values in frontmatter are respected — triage only fills missing
fields. Already-triaged entries (priority set) are still moved if status was
left as `pending`.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/autonomous-loop.mjs" backlog triage \
  --repo "$PWD"
```

Returns JSON: `{ triaged: <count>, results: [{ id, ...updates, from, to }] }`.

## Auto-invocation

The Cross-Slice Continuation HARD RULE invokes triage automatically when
`docs/backlog/pending/` is non-empty, before checking
`approved-slices.md` for the next slice. PM-dropped features get triaged
without manual command.

For higher-quality triage (semantic priority assessment, dep graph
analysis), the agent can edit frontmatter directly after this command runs.
The plugin's heuristic is a no-thinking baseline, not a final answer.
