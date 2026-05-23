---
id: FEAT-004
status: pending
priority: P3
category: integration
target_release: tbd
created: 2026-05-22
updated: 2026-05-22
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
phase: 4
---

# FEAT-004: Optional cross-repo parentRunId (deferred)

## Description

Allow a final-synthesis in repo A to declare a child run in repo B.
Useful when an loop slice in one product repo triggers
a follow-on slice in a sibling product repo (e.g. backend slice
triggers a frontend slice).

Schema:

- `final-synthesis` frontmatter optionally carries `triggers_run`:
  `{ repo: <path-or-url>, hint: <one-line> }`.
- `brief-me` in the target repo surfaces incoming `triggers_run`
  references that have no matching local run yet.

## Acceptance hints

- DO NOT BUILD until a concrete cross-repo workflow is observed in
  practice — premature integration risk.
- If built: tests must not require both repos on disk simultaneously
  (use fixtures).
