---
name: next-slice
description: Pick the next PENDING slice from approved-slices.md and surface it for implementation.
auto_execute_steps: false
---

# Pick Next Slice

Use after completing a slice (artifacts written, completed-slices.md updated)
or when starting a fresh session in a loop-enabled repo.

Workflow:

1. Read `<backlogPath>/approved-slices.md`. Pick the highest-priority slice
   whose status is PENDING.
2. Open the slice file referenced by that entry under `<slicesRoot>/`.
3. Report:
   - slice number + title
   - file path
   - priority
   - acceptance criteria count
   - any unresolved questions / risks in the slice file
4. Begin the Wiggin Loop on this slice. Do not pause for confirmation per the
   Autonomous Loop Instruction HARD RULE.

If `approved-slices.md` has no PENDING entries:

- If `<backlogPath>/product-backlog.md` still has unmet requirements, fall
  through to `/loop:derive-slice`.
- If both are exhausted and all gate sets in `<aiLoopRoot>/02-acceptance-gates/`
  are PASS, the loop's stop condition A is satisfied — stop.
- Otherwise the loop is in stop condition B (externally blocked) or the user
  needs to populate the backlog. Surface the situation explicitly.
