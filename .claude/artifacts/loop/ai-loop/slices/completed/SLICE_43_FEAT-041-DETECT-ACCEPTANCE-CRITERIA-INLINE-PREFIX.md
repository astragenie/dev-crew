---
id: SLICE-43
title: detectAcceptanceCriteria inline-prefix support (FEAT-041)
feature: FEAT-041
status: completed
requires_validation: false
completed_at: 2026-06-05
updated: 2026-06-05
---
## Goal

Extend `detectAcceptanceCriteria` in `backlog-triage.mts` to recognize the inline
`"Acceptance criteria:"` prefix format produced by `/loop:backlog add`, which stores
feature bodies as paragraphs rather than ATX-heading structured documents.

## Acceptance criteria

- AC-1: `"Acceptance criteria:"` prefix mid-line triggers section detection
- AC-2: `AC-N:` labels on the opener line are counted (paragraph format)
- AC-3: Bullet lines after the inline prefix are counted (list format)
- AC-4: Existing `## Acceptance criteria` heading detection unaffected
- AC-5: `triageEntry` returns `autonomous_safe: true` for inline-prefix bodies with ≥3 ACs

## Changes

- `src/scripts/lib/backlog-triage.mts` — extended `detectAcceptanceCriteria`
- `src/tests/backlog-triage-autosafe.test.mts` — 5 new tests
- Compiled outputs: `scripts/lib/backlog-triage.mjs`, `tests/backlog-triage-autosafe.test.mjs`
