# Task Handoff: Wire model routing into dispatch instruction

- Created: 2026-05-27T04:53:50.022Z
- From: builder
- To: lead
- Objective: buildDispatchInstruction now exports a model hint line so subagents know which model to use for build work, threaded from resolveModel via startSlice.
- Allowed Scope:
  - scripts/lib/slice-linker.mjs
  - tests/model-router.test.mjs
  - .claude/loop.json
- Forbidden Scope: -
- Deliverable: export buildDispatchInstruction with modelHint param, resolveModel(build) called in startSlice, 2 new tests, modelRouting config in loop.json
- Changed Files:
  - scripts/lib/slice-linker.mjs
  - tests/model-router.test.mjs
  - .claude/loop.json
- Confidence: high
- Risks: none
- Suggested Next Handoff: Task 3: Compress loop-rules.md and deduplicate CLAUDE.md

