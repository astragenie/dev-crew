---
name: start
description: First action for a fresh loop session — read mandatory docs, pick highest-priority PENDING slice, run the first-response checklist.
auto_execute_steps: false
---

## Marathon runner routing

Before executing the sequential walker, check `.claude/loop.json` for
`loop.marathonRunner`:

```bash
RUNNER=$(bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" config get loop.marathonRunner --repo "$PWD" 2>/dev/null || echo "sequential")
```

If `RUNNER === "wave"`, delegate to `/loop:wave loop` and exit. Do not run
the sequential walker. The wave loop respects the same `loop.maxIterations`,
`loop.autoMode`, and `/loop:stop-check` conditions, plus the wave-specific
halt reasons documented in `commands/wave.md`.

If `RUNNER === "sequential"` (default), proceed with the existing workflow
below.

# Start Autonomous Loop Session

Use this once per session, before invoking `/crew:build` or `/crew:fix`. It
loads the Wiggin Loop entry sequence so the rest of the session inherits the
autonomous discipline.

Workflow:

1. Confirm the workspace and that the loop is installed:
   ```bash
   pwd
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" status --repo "$PWD"
   ```
2. If `status` reports no marker block, run `/loop:install` first.
3. Read in this order:
   - `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` (persona, stack, mandatory reading list)
   - `<backlogPath>/approved-slices.md` (pick highest-priority PENDING slice)
   - the slice file referenced by that entry
   - `<aiLoopRoot>/01-loop-control/WIGGIN_LOOP.md`
   - `<aiLoopRoot>/01-loop-control/EVIDENCE_RULES.md`
   - `<aiLoopRoot>/01-loop-control/STOP_CONDITIONS.md`
4. Run the first-response checklist from MASTER_PROMPT.md. Report findings:
   solution / project inventory, backlog state, current slice, key gaps.
5. Begin the slice. Do NOT stop for confirmation between Wiggin Loop steps
   (DISCOVER → PLAN → IMPLEMENT → BUILD → TEST → REVIEW → SCORE → FIX) per
   the Autonomous Loop Instruction HARD RULE.

If `<backlogPath>/approved-slices.md` is empty but `product-backlog.md` has
unmet requirements, follow the Cross-Slice Continuation HARD RULE: derive a
new slice into `<slicesRoot>/pending/`, run Reviewer A and Reviewer B, append
to `approved-slices.md`, then implement.

The plugin commands `/loop:next-slice` and `/loop:derive-slice`
are thin helpers around these flows.
