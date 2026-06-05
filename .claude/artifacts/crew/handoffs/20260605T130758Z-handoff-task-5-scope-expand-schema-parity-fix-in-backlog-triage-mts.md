# Task Handoff: Task 5 scope-expand: schema parity fix in backlog-triage.mts

- Created: 2026-06-05T13:07:58.905Z
- From: builder
- To: lead
- Objective: Added pm_* dimension key writes to the new-schema branch of triageEntry so regex-fallback triage produces the same frontmatter shape as the PM happy path.
- Allowed Scope:
  - src/scripts/lib/backlog-triage.mts and its emitted scripts/lib/backlog-triage.mjs only; no other files touched.
- Forbidden Scope: -
- Deliverable: 5-line if-block after resolvedScores ternary that writes all five pm_* keys when isLegacy is false; full test suite green (780/780).
- Changed Files:
  - src/scripts/lib/backlog-triage.mts
  - scripts/lib/backlog-triage.mjs
- Confidence: high
- Risks: tests/triage-flow.test.mjs (emitted from the renamed test) is still untracked — the prior Task 5 builder must stage it separately; that file is outside my scope.
- Suggested Next Handoff: Lead should have the Task 5 builder (or the lead directly) stage tests/triage-flow.test.mjs and the modified src/tests/triage-flow.test.mts, then move to Task 6.

