---
id: FEAT-006
status: in-progress
priority: P1
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: [FEAT-005]
slices: [SLICE-26, SLICE-27]
derived_from: null
pm_customer_impact: 0.6
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.9
pm_technical_risk: 0.95
pm_dependency_depth: 0.9
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-18
autonomous_safe: true
triage_notes: "Highest strategic value (mission completion) but the single most irreversible step in the program -- technical_risk 0.95, banded at the rubric's top row ('public/cross-plugin contract change... hard-to-reverse effects') because the marketplace entry is consumed by every adopter repo; autonomousSafe=false both per the task's explicit instruction and independently confirmed by this banding; effort_points=3 keeps decomposition optional, but the risk floor is what actually gates this phase, not the size."
proposed_slices:
  - id_suffix: -SLICE-1
    title: migrate-adopter.mts run across adopter repos (dry-run first)
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: Astramem recall window + marketplace swap (operator-gated) + parent archive
    points: 1
    estimated_tokens: 60000
tags: ["stack:typescript", "area:adopter-migration", "concern:release-cutover"]
needs_contract: false
needs_ux: false
arch_attempt: 0
arch_status: approved
arch_review: approved
started_at: 2026-08-19
---
## Description

P5 Cutover: run migrate-adopter.mts (idempotent, --dry-run first) over local adopter repos (re-enumerate at execution; snapshot ~10): regenerate marker blocks via installer (one devcrew:start block replaces runner:start + crew:start), rewrite dispatch tokens outside markers per P3 map, migrate configs; astramem dual-project recall window [dev-crew, runner-plugin] config; replace crew+runner marketplace entries with one devcrew entry (EXPLICIT OPERATOR APPROVAL REQUIRED before marketplace edit); archive parents read-only. Exit gates: per-adopter installer idempotence green, one ceremony run in one adopter repo, operator sign-off. Full spec: unification-plan.md section 6 + P5 row.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given migrate-adopter.mts --dry-run is run first against a fresh adopter enumeration, When the dry-run output is reviewed, Then it prints a per-repo diff touching only marker blocks, dispatch tokens outside those blocks, and config files -- zero unexpected file touches.
- AC-2: Given the installer regenerates marker blocks, When migrate-adopter.mts runs twice in sequence against the same adopter repo, Then the second run is a no-op (zero file diffs on the second pass).
- AC-3: Given the marketplace swap (crew+runner entries -> one devcrew entry) is the single most irreversible step in the whole program, When the migration script reaches that step, Then it halts and requires an explicit operator confirmation input before writing to astra-marketplace -- proceeding without that confirmation is a failing state for this AC.
- AC-4: Given one adopter repo is chosen for the live ceremony smoke test, When one full slice ceremony runs under /devcrew:* in that adopter, Then it completes PASS and the adopter's CLAUDE.md shows exactly one <!-- devcrew:start -->...<!-- devcrew:end --> block with zero leftover <!-- runner:start --> or <!-- crew:start --> blocks.
- AC-5: Given the astramem dual-project recall window is configured, When recall_memory(project:["dev-crew","runner-plugin"]) is queried post-cutover, Then it returns at least one pre-merge memory record from the runner-plugin project.

## Proposed slices (PM decomposition)

- SLICE-1: migrate-adopter.mts run across adopter repos (dry-run first) (2 pts)
- SLICE-2: Astramem recall window + marketplace swap (operator-gated) + parent archive (1 pts)

> Operator approval 2026-08-18 (session instruction: "complete all task including p5 cutover yourself"): marketplace swap and adopter migration authorized for autonomous execution. Constraints that still hold: no force-push anywhere, dev-crew pushed and CI-verified before the marketplace entry flips, parents archived by tag+README note only (no GitHub repo archival), every step evidence-logged for morning review.
