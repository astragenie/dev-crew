# Task Handoff: Task 1: backlog list-pending-ids CLI helper

- Created: 2026-06-05T12:35:36.356Z
- From: builder
- To: lead
- Objective: Added listPendingFeatureIds helper, 3 passing tests, and backlog list-pending-ids CLI subcommand — deterministic FEAT-id guard for triage-consolidation.
- Allowed Scope:
  - Create src/scripts/lib/backlog-list-ids.mts
  - src/tests/backlog-list-ids.test.mts; modify src/scripts/loop.mts to add backlog list-pending-ids subcommand
- Forbidden Scope: -
- Deliverable: New listPendingFeatureIds function exported from backlog-list-ids module; CLI subcommand node scripts/loop.mjs backlog list-pending-ids --repo <path> returning {ids:[]}; 3 unit tests all passing
- Changed Files:
  - src/scripts/lib/backlog-list-ids.mts
  - src/tests/backlog-list-ids.test.mts
  - src/scripts/loop.mts
  - scripts/lib/backlog-list-ids.mjs
  - scripts/loop.mjs
  - tests/backlog-list-ids.test.mjs
- Confidence: high
- Risks: Pre-existing format failure in src/tests/slice-classify.test.mts (not in scope; was failing before this task). runBacklogAdd extraction is a minimal refactor required to keep complexity under cap — behavior-equivalent, existing tests cover it.
- Suggested Next Handoff: Task 2: FEAT-id existence guard in pm-write

