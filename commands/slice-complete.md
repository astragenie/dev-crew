---
description: Close a slice — move slice file to completed/, feature to done/, auto-roll satisfied specs, suggest grade as next action.
---

# Slice Complete

Atomic close ceremony at the end of a slice:

1. **Slice file** — moves from `<slicesRoot>/pending/` (or `active/`) to
   `<slicesRoot>/completed/`. Stamps frontmatter `status: completed`,
   `completed_at: <today>`. If the slice lives flat (LoopBrain-style
   `04-implementation-slices/`), updates frontmatter in place — no move.
2. **Feature file** — finds the slice's `feature: FEAT-NNN` back-ref,
   locates the feature in any backlog state, moves it to
   `docs/backlog/done/`. backlog-writer auto-stamps `completed_at`.
3. **Spec reconcile** — runs `reconcileSpecStatus` so any parent SPEC
   whose derived features are all `done` auto-rolls to `satisfied`.

Usage:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" slice complete \
  --repo "$PWD" \
  --id SLICE-NN
```

Returns:

```json
{
  "slice": { "id": "SLICE-52", "from": "docs/ai-loop/slices/pending/SLICE_52_X.md", "to": "docs/ai-loop/slices/completed/SLICE_52_X.md" },
  "feature": { "id": "FEAT-001", "from": "docs/backlog/in-progress/FEAT-001.md", "to": "docs/backlog/done/FEAT-001.md" },
  "specStatusChanges": [{ "id": "SPEC-001", "from": "decomposed", "to": "satisfied" }],
  "nextAction": "Run /loop:slice grade --id SLICE-52 to capture lessons + decisions."
}
```

## When to run

After acceptance criteria PASS with evidence and the slice's review +
validation artifacts are in Crew. The complete step is what bridges the
Wiggin Loop iteration to the next slice.

## What to do after

The returned `nextAction` is a literal prompt:

```bash
/loop:slice grade --id SLICE-52
# ...agent fills the grade...
/loop:slice grade-write --id SLICE-52
```

Grading at slice close is what feeds the retrospective + pattern alerts.
Skipping it leaves a hole in the self-improvement signal.
