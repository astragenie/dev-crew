# Task Handoff: SLICE-71: delete one-shot migrators + loop-installer caller cleanup

- Created: 2026-06-07T09:47:02.407Z
- From: builder
- To: lead
- Objective: Deleted adhoc-migrator.mts and legacy-migrator.mts (source + compiled + tests) and removed all import/call sites from loop-installer.mts; all self-verify gates pass.
- Allowed Scope:
  - src/scripts/lib/adhoc-migrator.mts
  - src/scripts/lib/legacy-migrator.mts
  - their test files
  - compiled .mjs artifacts
  - and import/call cleanup in src/scripts/lib/loop-installer.mts
- Forbidden Scope: -
- Deliverable: Four source files deleted, four compiled artifacts deleted, loop-installer.mts cleaned of migrateLegacyAutonomousLoop import/call, appendLegacyMigrationWrites helper, runAdhocMigration helper, and legacyMigration return field
- Changed Files:
  - src/scripts/lib/loop-installer.mts (modified); src/scripts/lib/adhoc-migrator.mts (deleted); src/scripts/lib/legacy-migrator.mts (deleted); src/tests/adhoc-migrator.test.mts (deleted); src/tests/legacy-migrator.test.mts (deleted); scripts/lib/adhoc-migrator.mjs (deleted); scripts/lib/legacy-migrator.mjs (deleted); tests/adhoc-migrator.test.mjs (deleted); tests/legacy-migrator.test.mjs (deleted)
- Confidence: high
- Risks: none
- Suggested Next Handoff: FEAT-069 Phase A complete — proceed to FEAT-070 Phase B (tsconfig + standards) or run /loop:slice-complete ceremony for SLICE-71

