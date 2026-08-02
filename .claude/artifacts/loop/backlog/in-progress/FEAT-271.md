---
id: FEAT-271
status: in-progress
priority: P2
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-167, SLICE-168, SLICE-169]
derived_from: null
tags: [be, infra, docs]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.55
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.5
pm_technical_risk: 0.35
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-02
autonomous_safe: true
triage_notes: "P2: real, evidenced fleet-wide review-ladder waste with a working reference implementation already proven in this repo + dev-team, but genuinely net-new plumbing (no existing light-ladder flag) keeps it out of P1's 'trivial effort' bar."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Add light reviewers.ladder block across all 6 preset templates (batch, mechanical)"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "/runner:install light-ladder selection flag + idempotent write"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: ADOPTION.md rollout guidance incl. when NOT to trim
    points: 1
    estimated_tokens: 60000
started_at: 2026-08-02
github_issue: 569
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/569"
slices_complete: [SLICE-167]
---
## Description

Light reviewer-ladder install preset for consumer repos. Fleet audit 2026-08-02: 13/15 consumer repos run the full two-reviewer ladder ['A','B'] with no validation.satisfiedByReview — every slice pays builder + 2 reviewers + validator at full context (astra-render: 7 dispatches/slice median, 397k tok/msg, 100% Opus). Only dev-team and runner-plugin run the trimmed ['A'] + satisfiedByReview config. Scope: add a documented 'light' block to install-time preset templates (scripts/presets/) seeding reviewers.ladder: ['A'] + validation.satisfiedByReview: true for repos with CI test gates; /runner:install --preset flag support if absent; ADOPTION.md rollout guidance including when NOT to trim (no CI gate = keep two reviewers).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a consumer repo with CI test gates configured, When it installs with a 'light' ladder option, Then .claude/loop.json is seeded with reviewers.ladder: ["A"] and validation.satisfiedByReview: true.
- AC-2: Given a repo installing without the light flag, When installed, Then behavior is unchanged (defaults to the existing ["A","B"] full ladder) -- backward compatible.
- AC-3: Given a repo with NO CI test gate, When ADOPTION.md rollout guidance is followed, Then it explicitly instructs keeping the two-reviewer ladder rather than trimming.
- AC-4: Given /runner:install --preset <stack> with the light option, When run twice (idempotent), Then the second run does not duplicate or corrupt the reviewers block.

## Proposed slices (PM decomposition)

- SLICE-1: Add light reviewers.ladder block across all 6 preset templates (batch, mechanical) (2 pts)
- SLICE-2: /runner:install light-ladder selection flag + idempotent write (2 pts)
- SLICE-3: ADOPTION.md rollout guidance incl. when NOT to trim (1 pts)
