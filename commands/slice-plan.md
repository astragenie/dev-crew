---
description: Run the codebase research pre-flight for a slice and write an editable plan artifact under .claude/artifacts/loop/plans/.
---

# Slice Plan

Runs the codebase research pre-flight pass for a slice and writes an
editable plan artifact (Markdown) under `.claude/artifacts/loop/plans/`.

This is **FEAT-006 SLICE-A** — the bare pre-flight primitive. It has no
approval gate. The approval gate (keyed on `autonomous_safe`) is wired in
FEAT-006 SLICE-B.

## What it does

1. Locates the slice file under `.claude/artifacts/loop/ai-loop/slices/`
   (all sub-directories searched).
2. Parses the slice frontmatter for optional `in_scope_globs` and the
   `## In scope` body section to discover which source files to read.
3. **Codebase research pass** — for each in-scope file or glob:
   - Lists matching files under the repo root (skipping `node_modules`,
     `.git`, `dist`, `.claude`).
   - Reads the first 50 lines of each matched file.
   - Extracts exported symbol names via a regex pass
     (`export function|class|const`).
4. Writes `.claude/artifacts/loop/plans/<TS>-plan-<sliceId>.md` with:
   - Frontmatter: `slice`, `generated_at`, `files_count`.
   - Four editable sections: `## Context`, `## Files researched`,
     `## Open questions`, `## Proposed approach`.

## Usage

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" slice plan \
  --repo "$PWD" \
  --id SLICE-NN
```

## Returns

```json
{
  "planPath": ".claude/artifacts/loop/plans/20260602T120000Z-plan-SLICE-10.md",
  "sections": {
    "context": "...",
    "filesResearched": "...",
    "openQuestions": "...",
    "proposedApproach": "..."
  },
  "filesResearched": ["src/scripts/lib/slice-plan.mts", "commands/slice-plan.md"]
}
```

## When to run

Before beginning implementation work on a new slice. The generated plan
artifact is the editable workspace for recording decisions, open questions,
and the proposed implementation approach.

FEAT-006 SLICE-B will wire `slice plan` into the `slice start` ceremony so
it runs automatically when `autonomous_safe: false` slices are started.
