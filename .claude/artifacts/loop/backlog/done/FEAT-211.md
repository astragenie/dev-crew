---
id: FEAT-211
status: done
priority: P2
category: refactor
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [refactor, tech-debt]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.35
pm_effort_estimate: 0.32
pm_strategic_alignment: 0.4
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.3-0.5: introduces one new shared pattern (not existing in repo as a single helper today) reused across 7-8 files -- cross-module reach but no contract/schema change, clean rollback via revert. P2: legitimate but low-severity (MED, not top-10) maintainability finding; cheap and safe but not customer-facing, so priority sits below the P1 telemetry-integrity and safety-procedure fixes in this batch."
completed_at: 2026-07-02
---
# FEAT-211: Shared appendJsonl helper

## Problem

Eight independent hand-rolled JSONL-append implementations inside
runner-plugin, each with divergent error handling / sync-vs-async /
batching semantics: `auto-dispatch.mts:63-93`, `dispatch-trace.mts:38-42`,
`dispatch-worktree.mts:54,170-179`, `error-pattern-registry.mts:198`,
`learnings.mts:82,130`, `learnings-citations.mts:15,30-42`,
`telemetry.mts:23`.

## Acceptance hints

- One `appendJsonl(path, record)` helper (keep the `_internals` test
  seam pattern from learnings-citations).
- All 8 call sites migrated; behavior-equivalence tests.

## Evidence

- Retrospective F-09 (WP5 §2).
