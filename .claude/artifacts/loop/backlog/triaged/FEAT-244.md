---
id: FEAT-244
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-242]
tags: [auth, infra]
needs_contract: false
needs_ux: false
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.65
pm_technical_risk: 0.3
pm_dependency_depth: 0.3
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "P2: important security-gating item for fleet rollout but small, narrowly-scoped, and not on the B1.5 pilot's critical path (can build in parallel with B1 per the plan's own ETA table note). technical_risk 0.3 and priority P2 — pre-mortem not mandatory, but cascade risk named per Framework 3 given this touches the headless-dispatch permission surface directly."
---
## Description

Watcher headless-reaction permission allowlist, code-side (Track B3 code half). Layer 2 headless claude -p reaction sessions must run under pre-configured permission allowlist (settings permissions / --allowedTools) and NEVER pass --dangerously-skip-permissions — enforce via unit test asserting constructed spawn args never include that flag plus grep/lint check over spawn call sites. Also: tick resilience to unreachable repos — registry entry the token cannot reach (403/404 from gh) logs clear unreachable/insufficient-scope per-repo error state and tick continues sweeping remaining repos, never crashes whole tick. PAT provisioning half (fine-grained least-privilege token, per-org/repo allowlist, issues:write only where filing needed, distinct from operator personal token) is a HUMAN action against GitHub org settings — track as checklist item in this FEAT description, not a slice. B3 completion gates fleet rollout (2+ machines). ACs AC-2, AC-3: 2026-07-07-watcher-acs-eta.md section B3. Est 1 slice, 0.5 day. Depends on FEAT-242 (B1) spawn call sites existing.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.