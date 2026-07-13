---
id: FEAT-243
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-242]
tags: [infra, workflow]
needs_contract: false
needs_ux: false
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.1
pm_strategic_alignment: 0.7
pm_technical_risk: 0.2
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-07-09
autonomous_safe: false
triage_notes: "P2: essential safety gate for fleet rollout but not a build item competing for loop dispatch cycles — it is human-run and calendar-bound (>=3 days), so it does not carry the same urgency-for-the-loop as FEAT-242. autonomousSafe: false per the plan's own explicit framing, confirmed by my own review (no divergence)."
github_issue: 496
github_url: https://github.com/astragenie/runner-plugin/issues/496
---
## Description

Pilot checkpoint: 2-3 repo watcher soak, >=3 days (Track B1.5 — operational gate, milestone type, NOT a build item). Human-run pilot on 1 machine (suggest runner-plugin + astrarunner + one active third repo), claim labels on from day one. Exit criteria before fleet rollout: unattended reaction completion >=70% (current pause rate 66.7% is the known risk), zero duplicate reactions, state files intact after kill mid-tick, orphaned-claim TTL self-heal verified (COND-1), no lost updates tick-vs-reaction concurrent write (COND-2), gh call budget validated vs rate-limit headers, sharding/multi-machine design finalized. Depends on FEAT-242 (B1) shipped. Evidence = pilot state files + operator log, not automated tests. autonomous_safe must be false — loop cannot run this; human observes over calendar days. ACs: 2026-07-07-watcher-acs-eta.md section B1.5. Gates B2 merge and fleet rollout.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.