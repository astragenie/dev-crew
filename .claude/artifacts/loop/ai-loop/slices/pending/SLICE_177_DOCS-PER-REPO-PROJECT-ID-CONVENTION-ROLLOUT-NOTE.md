---
id: SLICE-177
title: "Docs: per-repo project-id convention + rollout note"
status: pending
feature: FEAT-274
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-02
updated: 2026-08-02
effort_points: 1
estimated_tokens: 60000
---
# SLICE-177: Docs: per-repo project-id convention + rollout note

Implements FEAT-274. See [feature file](../../../backlog/in-progress/FEAT-274.md) for product context.

## Objective

Memory rollout seeding for consumer repos: 13/15 fleet repos have no memory block in .claude/loop.json — no recall, no creditLoop, agents re-learn everything per session (the 1.6% usefulness finding runner-plugin#525 was this rollout gap; creditLoop now proven in dev-team + runner-plugin). Scope: extend /runner:install (or a cost-setup-style idempotent seeding subcommand) to write the memory config block — enabled, project id from repo name, profile.topLessons, feedback.creditLoop.enabled with k:5 — matching the W0.2 validate-memory-config.mts contract so the drift guard passes. Config-only; no daemon changes. Document per-repo project-id convention.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-274 and shared across 2 sibling slices — scope per-slice before close

- [ ] AC-1: Given a consumer repo with no memory block in .claude/loop.json, When the new seeding subcommand runs, Then it writes memory.enabled, memory.project (derived from repo name), memory.profile.topLessons, and memory.feedback.creditLoop.enabled with k:5, matching the shape validate-memory-config.mts checks for.
- [ ] AC-2: Given a repo that already has a memory block, When the seeding subcommand runs again, Then it is idempotent -- no duplicate keys, no clobbering of existing custom values (mirroring runner:cost-setup's idempotent-migrate behavior).
- [ ] AC-3: Given the seeded config, When bun ./src/scripts/validate-memory-config.mts runs against it, Then the gate passes (no drift flagged).
- [ ] AC-4: Given the per-repo project-id convention, When documented, Then README.md (or ADOPTION.md) states the naming rule so future repos don't collide.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-274 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
