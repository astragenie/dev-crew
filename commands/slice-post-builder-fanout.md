---
description: Emit a single parallel-dispatch payload with reviewers A+B and the validator after builder PASS.
---

# Slice — Post-Builder Fanout

Replaces the serial reviewer-A -> reviewer-B -> validator sequence with a single parallel dispatch of all three.

Usage:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" slice post-builder-fanout \
  --repo "$PWD" \
  --id SLICE-91
```

Returns `{ sliceId, tasks[3], instructions, aggregation }`. The orchestrator emits one message with three Agent tool calls — one per task.

Validator runs independently of reviewers; it does NOT read review artifacts. Wasted-dispatch cost on FAIL slices is acceptable per the design spec.

Config: `slice.postBuilderFanout` in `.claude/loop.json` (default `true`). Flip to `false` to revert to the serial ladder.
