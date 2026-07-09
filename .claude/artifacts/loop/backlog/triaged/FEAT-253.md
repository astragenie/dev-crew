---
id: FEAT-253
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: [FEAT-252]
slices: []
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.5
pm_dependency_depth: 0.45
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-09
autonomous_safe: true
triage_notes: "Composes two already-existing providers (no new external dependency) but correctness-critical partial-failure semantics keep technical_risk at the top of the 0.3-0.5 band (0.5); hard-blocked on FEAT-252 (dependency_depth 0.45); realizes the program's dual-tracker AC -> P2."
tags: [api-change, infra]
needs_contract: true
needs_ux: false
---
## Description

Tracker-provider program Phase 4 — CompositeProvider. CompositeProvider(providers[]) implementing TaskStoreProvider: fan out every mirror call in configured order; per-child error isolation (one failing tracker never blocks others or the loop); id recording per the COND-B DEC made in the LinearProvider FEAT (map-return or composite-owns-stamping — both external ids must end up in FEAT frontmatter). Partial-failure visibility per review COND-B: warn-level log distinguishing 'provider not configured' from 'provider configured but call failed' per child — github-ok/linear-fail must leave a visible warn trail (test-asserted) because close-time Linear calls otherwise silently no-op; retry/alerting explicitly deferred to follow-up FEAT if pilot shows need. Config: taskStore.providers: ['github','linear'] array form takes precedence over singular provider; getProvider resolution order unit-tested including github.enabled back-compat and unknown-name warning. Docs page: BacklogStore (storage, always file today) vs TaskStoreProvider (mirror) split. depends_on: FEAT-252. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.