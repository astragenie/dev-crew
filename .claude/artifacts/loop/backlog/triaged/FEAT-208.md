---
id: FEAT-208
status: triaged
priority: P1
category: ci
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [ci, observability]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.65
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.3-0.5 (behavior change to a shared quality gate -- pre-push hook + CI -- cross-module reach between validate script and CI workflow config, no data-shape change, clean rollback). P1 (upgraded from the retrospective stub's P2): I directly verified this is an active, currently-live routing bug (FEAT-090/094 mis-listed right now), not just a stale-metric nuisance, which raises customer_impact above what a purely cosmetic staleness fix would warrant."
---
# FEAT-208: Blocking staleness gate for loop-snapshot

## Problem

`loop-snapshot.md` is @-injected into every session's context. At
retrospective time it was 19 days stale: grades 112 vs 117 actual, done
121 vs 125, and 2 of its 5 "Top triaged (next to slice)" FEATs
(FEAT-090, FEAT-094) already in done/. The staleness check
(`pre-push-validate.mts --check-generated`) always exits 0 (warn-only)
and is not in the CI gate list.

## Acceptance hints

- Snapshot older than the newest grade/backlog change fails CI (or
  triggers auto-regeneration).
- Fixture test: stale snapshot -> red.

## Evidence

- Retrospective top-10 #5 (WP7); `loop-snapshot.md:1,8-20`;
  `src/scripts/pre-push-validate.mts:1-11,20-43`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given .claude/artifacts/loop/loop-snapshot.md's generation timestamp is older than the newest file under .claude/artifacts/loop/grades/ or the newest backlog state change, When pre-push-validate.mts --check-generated runs, Then it exits non-zero (or triggers auto-regeneration before exiting 0) instead of the current always-exit-0 warn-only behavior (src/scripts/pre-push-validate.mts:11,20-43).
- AC-2: Given the snapshot is fresh (regenerated at or after the newest grade/backlog change), When the same check runs, Then it exits 0 -- the gate does not false-positive on an up-to-date snapshot.
- AC-3: Given a fixture reproducing the exact drift observed live this session (125 actual done vs snapshot's stated 121, 117 actual grades vs stated 112, FEAT-090/FEAT-094 physically in done/ while listed as 'next to slice'), When fed to the staleness check, Then the check fails (red), proving the gate catches the precise failure mode this session hit.
- AC-4: Given the staleness gate now blocks, When it is wired into the CI gate list (CLAUDE.md Section 'CI gates'), Then the gate command is documented there alongside the other 8 numbered CI steps, closing the 'warn-only, not in the CI gate list' gap the FEAT body cites.
