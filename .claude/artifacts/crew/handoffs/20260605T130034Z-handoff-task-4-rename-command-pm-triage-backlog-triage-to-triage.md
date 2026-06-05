# Task Handoff: Task 4: Rename command pm-triage/backlog-triage to triage

- Created: 2026-06-05T13:00:34.727Z
- From: builder
- To: lead
- Objective: Deleted commands/backlog-triage.md and created commands/triage.md; pm-triage.md was already absent.
- Allowed Scope:
  - commands/backlog-triage.md deleted
  - commands/triage.md created — markdown only
  - no source files touched
- Forbidden Scope: -
- Deliverable: commands/triage.md created with exact specified content; commands/backlog-triage.md removed via git rm; validate-manifests PASS; 776/776 tests PASS
- Changed Files:
  - commands/triage.md
  - commands/backlog-triage.md (deleted)
- Confidence: high
- Risks: format:check fails on pre-existing src/scripts/loop.mts and src/tests/slice-classify.test.mts — not introduced by this task (confirmed by stash check)
- Suggested Next Handoff: Task 5: Rename test file + add regex fallback shape test

