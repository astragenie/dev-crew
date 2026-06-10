---
description: Mark an existing decision as superseded by a newer one — updates both files atomically.
---

# Decisions Supersede

Sometimes a decision made in an earlier slice gets revisited and replaced.
This command records the relationship:

- Old decision: `status` → `superseded`, `superseded_by: DEC-NEW`
- New decision: unchanged (caller can add a `## Supersedes: DEC-OLD` line in
  body manually if desired)

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" decisions supersede \
  --repo "$PWD" \
  --id DEC-005 \
  --by DEC-009
```

`--id` is the older decision being superseded. `--by` is the newer decision
that replaces it. Both files must already exist.

Returns `{ oldId, newId, alreadySuperseded }`. Idempotent — re-running with
same args is a no-op.

## When to supersede

- A retrospective decision was reverted in a later slice — supersede with a
  new DEC capturing the reversal + rationale
- An architectural choice was replaced by a better one
- A workaround was eliminated by a proper fix; new DEC documents the fix

Don't use supersede for minor edits to the same decision. Edit the existing
file in-place instead.
