---
id: FEAT-245
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-242]
tags: [api-change, workflow]
needs_contract: true
needs_ux: false
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.4
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "P2: enables cross-repo watcher value (Track C) with a clear architect-mandated design (ISP-driven port separation), moderate effort (3 points), moderate technical_risk (0.4, one new module, no contract change) — solidly useful but secondary to shipping FEAT-242 first, consistent with the plan's own sequencing (B1 -> B1.5 gate -> C1 -> C3)."
---
## Description

IssueBroker port: cross-repo issue filing with idempotency contract (Track C1). New port in watcher subsystem — deliberately NOT layered on TaskStoreProvider.createIssue (ISP violation per arch review; task-store is repo-bound lifecycle sync, target repos may have no .claude/loop.json at all). API: fileIssue({targetGhSlug, title, body, labels}) -> externalId | null, non-throwing on backend failure. Keyed off registry ghSlug; composes GithubProvider internally (LinearProvider slot documented as pending C2, deferred). Idempotency contract: deterministic title hash + loop-filed label + gh issue list --search before create — persisting root cause must NOT re-file every 5 minutes; test asserts exactly one gh issue create across two fileIssue calls with identical title-hash. COND-6 accepted residual risk: two DIFFERENT source repos filing same root cause concurrently may produce at most one duplicate ticket (not corrupted state) — concurrency test documents, does not prevent; follow-up dedup sweep explicitly out of scope. ACs AC-1..AC-5: 2026-07-07-watcher-acs-eta.md section C1. Est 2 slices, 1-1.5 days. Depends on FEAT-242 (B1 registry shape); no dependency on pilot outcome.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.