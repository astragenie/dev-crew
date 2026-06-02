---
id: FEAT-004
status: done
priority: P2
category: feature
target_release: null
created: 2026-05-27
updated: 2026-05-28
depends_on: []
slices: [SLICE-01]
derived_from: null
triage_notes: no fields needed inference
started_at: 2026-05-27
completed_at: 2026-05-28
github_issue: 8
github_milestone: 1
phase: 1
---
## Description

Grade files currently named SLICE-NN-grade.md (bare, no timestamp or context). Should follow the same naming convention as other artifacts: timestamp-phase-feat-slice-grade.md.

This requires changes to grade-writer.mjs (file creation) and grade-parser.mjs (file discovery pattern).

## Acceptance hints

- Grade filenames: YYYYMMDDTHHMMSSZ-phase-N-featNNN-sliceNN-grade.md
- grade-parser still discovers grades with new naming
- Backward compatible: reads both old and new format