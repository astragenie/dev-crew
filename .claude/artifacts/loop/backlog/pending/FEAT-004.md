---
id: FEAT-004
status: pending
priority: P2
category: feature
target_release: null
created: 2026-05-27
updated: 2026-05-27
depends_on: []
slices: []
derived_from: null
---
## Description

Grade files currently named SLICE-NN-grade.md (bare, no timestamp or context). Should follow the same naming convention as other artifacts: timestamp-phase-feat-slice-grade.md.

This requires changes to grade-writer.mjs (file creation) and grade-parser.mjs (file discovery pattern).

## Acceptance hints

- Grade filenames: YYYYMMDDTHHMMSSZ-phase-N-featNNN-sliceNN-grade.md
- grade-parser still discovers grades with new naming
- Backward compatible: reads both old and new format