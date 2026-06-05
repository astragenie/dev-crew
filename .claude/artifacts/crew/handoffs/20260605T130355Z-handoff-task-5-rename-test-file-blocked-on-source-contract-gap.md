# Task Handoff: Task 5: Rename test file — blocked on source contract gap

- Created: 2026-06-05T13:03:55.457Z
- From: builder
- To: lead
- Objective: Test file renamed successfully (pm-triage-flow.test.mts → triage-flow.test.mts) and new test appended, but the test fails because triagePending does NOT write pm_* dimension keys for fresh features — this requires a source fix in backlog-triage.mts which is out of Task 5 scope.
- Allowed Scope:
  - Rename src/tests/pm-triage-flow.test.mts to triage-flow.test.mts; append regex-fallback shape test
- Forbidden Scope: -
- Deliverable: Renamed test file with new test case staged; escalation badge set; gates run
- Changed Files:
  - src/tests/triage-flow.test.mts
  - tests/triage-flow.test.mjs
- Confidence: low
- Risks: New test 'regex fallback writes same frontmatter shape' FAILS: triagePending returns {id, priority, autonomous_safe, triage_notes, from, to} for fresh features — pm_customer_impact, pm_effort_estimate, pm_strategic_alignment, pm_technical_risk, pm_dependency_depth are absent. Root cause: resolveNewSchemaScores() in backlog-triage.mts reads pm_* from frontmatter into local scores object but never writes defaults back to updates. The legacy migration path (applyLegacyMigration) DOES write pm_* defaults, but fresh features take the new-schema path. Fix requires adding a loop in triageEntry that writes DEFAULT_SCORES to updates when the key is missing — one-liner fix, but it touches src/scripts/lib/backlog-triage.mts which is a source file. Constraint says do not touch source files.
- Suggested Next Handoff: Lead should either: (a) grant scope to fix src/scripts/lib/backlog-triage.mts (add pm_* default writes in triageEntry for new-schema path), then re-run Task 5 gates; or (b) revise the test spec to match current behavior (checking only autonomous_safe + triage_notes)

