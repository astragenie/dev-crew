---
id: FEAT-274
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-176, SLICE-177]
derived_from: null
tags: [be, docs]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.75
pm_technical_risk: 0.2
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-08-02
autonomous_safe: true
triage_notes: "P1: high-evidence customer impact directly tied to a previously diagnosed root cause (the 1.6% usefulness finding), low effort (config-only, mirrors the already-shipped cost-setup pattern), low risk (validated against an existing CI gate) -- a strong, low-risk quick win."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Memory-config idempotent seeding subcommand (mirror cost-setup pattern)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "Docs: per-repo project-id convention + rollout note"
    points: 1
    estimated_tokens: 60000
started_at: 2026-08-02
github_issue: 583
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/583"
---
## Description

Memory rollout seeding for consumer repos: 13/15 fleet repos have no memory block in .claude/loop.json — no recall, no creditLoop, agents re-learn everything per session (the 1.6% usefulness finding runner-plugin#525 was this rollout gap; creditLoop now proven in dev-team + runner-plugin). Scope: extend /runner:install (or a cost-setup-style idempotent seeding subcommand) to write the memory config block — enabled, project id from repo name, profile.topLessons, feedback.creditLoop.enabled with k:5 — matching the W0.2 validate-memory-config.mts contract so the drift guard passes. Config-only; no daemon changes. Document per-repo project-id convention.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a consumer repo with no memory block in .claude/loop.json, When the new seeding subcommand runs, Then it writes memory.enabled, memory.project (derived from repo name), memory.profile.topLessons, and memory.feedback.creditLoop.enabled with k:5, matching the shape validate-memory-config.mts checks for.
- AC-2: Given a repo that already has a memory block, When the seeding subcommand runs again, Then it is idempotent -- no duplicate keys, no clobbering of existing custom values (mirroring runner:cost-setup's idempotent-migrate behavior).
- AC-3: Given the seeded config, When bun ./src/scripts/validate-memory-config.mts runs against it, Then the gate passes (no drift flagged).
- AC-4: Given the per-repo project-id convention, When documented, Then README.md (or ADOPTION.md) states the naming rule so future repos don't collide.

## Proposed slices (PM decomposition)

- SLICE-1: Memory-config idempotent seeding subcommand (mirror cost-setup pattern) (2 pts)
- SLICE-2: Docs: per-repo project-id convention + rollout note (1 pts)
