---
id: FEAT-183
status: pending
priority: null
category: tech-debt
target_release: null
created: 2026-06-10
updated: 2026-06-10
depends_on: []
slices: []
derived_from: null
---
# FEAT-183: Derive-only discipline: generated artifacts get do-not-edit headers + regen --check drift gate

Adopt AgentOps derive-only contracts (generated files carry an explicit 'Auto-generated — do not edit; re-run <script>' header; CI runs generators with --check to fail on drift). Loop-generated artifacts (loop-snapshot.md, slice-progress.md, COMMANDS-style docs, auto-run summaries) currently accept silent hand-edits that diverge from reality until the next regen clobbers them.

## Acceptance hints
- All loop generators stamp a standard header line incl. the regen command.
- New `loop doctor --check-generated` (or pre-push-validate stage) re-runs cheap generators in-memory and diffs; non-zero exit lists drifted files.
- Wire into pre-push-validate.mjs; warn-only first release, blocking after.