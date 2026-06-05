# Task Handoff: Task 2: FEAT-id existence guard in pm-write

- Created: 2026-06-05T12:52:24.805Z
- From: builder
- To: lead
- Objective: Added deterministic FEAT-id existence guard to writePmScores using listBacklog, with a new failing-then-passing TDD test.
- Allowed Scope:
  - src/scripts/lib/backlog-pm-write.mts and src/tests/backlog-pm-write.test.mts only
- Forbidden Scope: -
- Deliverable: listBacklog-based ID guard at the top of writePmScores; optional evidence/reasoning fields on WritePmScoresOptions; new test 'writePmScores rejects --id for FEAT not present on disk'
- Changed Files:
  - src/scripts/lib/backlog-pm-write.mts
  - src/tests/backlog-pm-write.test.mts
  - scripts/lib/backlog-pm-write.mjs
  - tests/backlog-pm-write.test.mjs
- Confidence: high
- Risks: none
- Suggested Next Handoff: Task 3: Rename skill pm-triage to triage

