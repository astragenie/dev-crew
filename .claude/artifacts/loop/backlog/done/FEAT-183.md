---
id: FEAT-183
status: done
priority: P2
category: tech-debt
target_release: null
created: 2026-06-10
updated: 2026-06-13
completed_at: 2026-06-13
depends_on: []
slices: [SLICE-116]
derived_from: null
autonomous_safe: true
pm_customer_impact: 0.55
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.7
pm_technical_risk: 0.2
pm_dependency_depth: 0.05
composite_score: 0.67
triage_notes: "Derive-only headers + regen --check drift gate. Mechanical: stamp generators with do-not-edit header, --check mode in CI/pre-push, warn-first then block. Low risk, clean rollback -> autonomous."
started_at: 2026-06-13
github_issue: 250
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/250"
---
# FEAT-183: Derive-only discipline: generated artifacts get do-not-edit headers + regen --check drift gate

Adopt AgentOps derive-only contracts (generated files carry an explicit 'Auto-generated — do not edit; re-run <script>' header; CI runs generators with --check to fail on drift). Loop-generated artifacts (loop-snapshot.md, slice-progress.md, COMMANDS-style docs, auto-run summaries) currently accept silent hand-edits that diverge from reality until the next regen clobbers them.

## Acceptance hints
- All loop generators stamp a standard header line incl. the regen command.
- New `loop doctor --check-generated` (or pre-push-validate stage) re-runs cheap generators in-memory and diffs; non-zero exit lists drifted files.
- Wire into pre-push-validate.mjs; warn-only first release, blocking after.