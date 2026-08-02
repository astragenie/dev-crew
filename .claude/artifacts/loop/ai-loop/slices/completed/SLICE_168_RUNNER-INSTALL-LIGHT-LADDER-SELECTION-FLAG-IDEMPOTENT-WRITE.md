---
id: SLICE-168
title: "/runner:install light-ladder selection flag + idempotent write"
status: completed
feature: FEAT-271
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 568
github_url: "https://github.com/astragenie/runner-plugin/issues/568"
completed_at: 2026-08-02
---
# SLICE-168: /runner:install light-ladder selection flag + idempotent write

Implements FEAT-271. See [feature file](../../../backlog/in-progress/FEAT-271.md) for product context.

## Objective

Light reviewer-ladder install preset for consumer repos. Fleet audit 2026-08-02: 13/15 consumer repos run the full two-reviewer ladder ['A','B'] with no validation.satisfiedByReview — every slice pays builder + 2 reviewers + validator at full context (astra-render: 7 dispatches/slice median, 397k tok/msg, 100% Opus). Only dev-team and runner-plugin run the trimmed ['A'] + satisfiedByReview config. Scope: add a documented 'light' block to install-time preset templates (scripts/presets/) seeding reviewers.ladder: ['A'] + validation.satisfiedByReview: true for repos with CI test gates; /runner:install --preset flag support if absent; ADOPTION.md rollout guidance including when NOT to trim (no CI gate = keep two reviewers).

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-271 and shared across 3 sibling slices — scope per-slice before close

- [ ] AC-1: Given a consumer repo with CI test gates configured, When it installs with a 'light' ladder option, Then .claude/loop.json is seeded with reviewers.ladder: ["A"] and validation.satisfiedByReview: true.
- [ ] AC-2: Given a repo installing without the light flag, When installed, Then behavior is unchanged (defaults to the existing ["A","B"] full ladder) -- backward compatible.
- [ ] AC-3: Given a repo with NO CI test gate, When ADOPTION.md rollout guidance is followed, Then it explicitly instructs keeping the two-reviewer ladder rather than trimming.
- [ ] AC-4: Given /runner:install --preset <stack> with the light option, When run twice (idempotent), Then the second run does not duplicate or corrupt the reviewers block.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-271 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
