---
id: FEAT-246
status: triaged
priority: P3
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-242, FEAT-245]
tags: [workflow]
needs_contract: false
needs_ux: false
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.6
pm_technical_risk: 0.2
pm_dependency_depth: 0.5
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "P3: smallest, lowest-risk item in the batch, but blocked by two other unbuilt FEATs in this same backlog (FEAT-242 and FEAT-245) — dependency_depth 0.5 and 'mostly glue' scope place it last in this batch's priority ordering, though it is not low-value: it is the piece that makes C1's cross-repo filing actually actionable."
github_issue: 498
github_url: https://github.com/astragenie/runner-plugin/issues/498
---
## Description

Tracker-as-queue: tier-1/tier-2 cross-repo pickup flow (Track C3, mostly glue). Watcher A detects root cause belonging in repo B -> calls C1 fileIssue against repo B -> NO direct cross-repo dispatch ever (test asserts watcher A code path never spawns claude -p targeting repo B cwd); the tracker IS the queue. Tier-1 repo B (loop-installed): next tick sweeps, detects filed issue as ordinary new-issue finding, reacts via /runner:intake --from-issue with zero special-casing beyond existing new-issue flow. Tier-2 repo B (watch-only, no loop config): no automated reaction attempted, issue waits for human — test asserts tier-2 registry entry never triggers Layer 2 spawn regardless of finding type. ACs AC-1..AC-3: 2026-07-07-watcher-acs-eta.md section C3. Est 1 slice, 0.5 day. Depends on FEAT-242 (B1 tier-1/tier-2 tick logic) + relates to FEAT-245 (C1 fileIssue).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.