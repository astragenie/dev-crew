---
id: FEAT-003
status: done
priority: P1
category: bugfix
target_release: null
created: 2026-05-27
updated: 2026-05-28
depends_on: []
slices: [SLICE-04]
derived_from: null
triage_notes: no fields needed inference
completion_notes: "Completed via SLICE-04 (commit 5c02b2d). grade-writer, crew-bridge handoff, and crew-bridge final-synthesis now emit phase→feature→slice identification headers. renderIdentification exported from agent-report-writer. Null fields omitted cleanly. 366/366 tests pass."
github_issue: 6
github_milestone: 1
phase: 1
---
## Description

All crew and loop artifacts should display phase, feature, and slice identification consistently at the top. Currently:
- Some artifacts show feature first, then phase (wrong order)
- Some artifacts omit phase/feat/slice entirely
- Order should always be: phase -> feature -> slice (wide -> narrow)

Affected artifact types: cost-advise, agent-report, review-result, validation-result, handoff, final-synthesis, run-brief, pm-review.

Also: empty validations folder in consuming repos — no validation artifacts being written during slice work. Need to investigate whether crew:validator is being dispatched.

## Acceptance hints

- Every artifact frontmatter has phase/feature/slice fields in consistent order
- Every artifact body starts with phase/feat/slice identification
- Validation artifacts actually written when behavior changes
