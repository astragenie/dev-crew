---
id: FEAT-253
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
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
pm_reviewed: 2026-07-10
autonomous_safe: true
triage_notes: "CompositeProvider fan-out with the COND-B partial-failure warn distinction as its correctness-critical core; hard-blocked on FEAT-252 landing first. technical_risk 0.5 sits at the top of the 0.3-0.5 band (composes two existing-or-soon-to-exist providers, no new external dependency of its own, but correctness-critical semantics) — confirmed, not adjusted. P2 confirmed."
tags: [api-change, infra]
needs_contract: true
needs_ux: false
github_issue: 501
github_url: https://github.com/astragenie/runner-plugin/issues/501
---
## Description

Tracker-provider program Phase 4 — CompositeProvider. CompositeProvider(providers[]) implementing TaskStoreProvider: fan out every mirror call in configured order; per-child error isolation (one failing tracker never blocks others or the loop); id recording per the COND-B DEC made in the LinearProvider FEAT (map-return or composite-owns-stamping — both external ids must end up in FEAT frontmatter). Partial-failure visibility per review COND-B: warn-level log distinguishing 'provider not configured' from 'provider configured but call failed' per child — github-ok/linear-fail must leave a visible warn trail (test-asserted) because close-time Linear calls otherwise silently no-op; retry/alerting explicitly deferred to follow-up FEAT if pilot shows need. Config: taskStore.providers: ['github','linear'] array form takes precedence over singular provider; getProvider resolution order unit-tested including github.enabled back-compat and unknown-name warning. Docs page: BacklogStore (storage, always file today) vs TaskStoreProvider (mirror) split. depends_on: FEAT-252. Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1 (happy path): Given `taskStore.providers: ["github", "linear"]` configured (array form) with both child providers reachable, When `CompositeProvider.publishFeature(feat)` is called, Then it fans out `publishFeature` to both children in configured order and, per the COND-B stamping DEC made in FEAT-252's Phase 3, records both external ids so the FEAT ends up with both `github_issue:` and `linear_issue:` frontmatter set -- evidenced by a test asserting both fields are populated after a composite publish against mock transports.
- AC-2 (COND-B partial-failure warn trail -- headline correctness requirement per review): Given `taskStore.providers: ["github", "linear"]` where the GitHub child succeeds and the Linear child call fails (network/API error), When any CompositeProvider method fans out, Then a warn-level log line is emitted that explicitly labels this as 'provider configured but call failed' for the Linear child, distinct from a not-configured warning, and the successful GitHub result is still returned/stamped -- evidenced by a test asserting the warn message content for the github-ok/linear-fail combination named directly in the review.
- AC-3 (distinguishing not-configured from configured-but-failed): Given `taskStore.providers: ["github"]` only (Linear entirely absent from config), When CompositeProvider fans out a call, Then no 'call failed' warning is emitted for the absent Linear child -- silence is the correct behavior for 'not configured', distinguishing this from AC-2's failure case -- evidenced by a test asserting zero 'call failed'-shaped warn-log invocations in the not-configured scenario.
- AC-4 (config resolution precedence): Given both `taskStore.providers: [...]` (array) and a legacy `taskStore.provider: "github"` (singular) are present in loop.json, When provider resolution runs, Then the array form takes precedence and a CompositeProvider is constructed from it -- evidenced by a unit test asserting array-over-singular precedence, plus a companion test confirming `github.enabled` back-compat still resolves correctly when neither `providers` nor `provider` is set.
- AC-5 (edge -- unknown provider name in array): Given `taskStore.providers: ["github", "bogus"]`, When CompositeProvider is constructed, Then a warning is logged naming the unknown provider name and the composite proceeds with only the valid (github) child -- evidenced by a test asserting the composite's resulting child count and the warning content.
- AC-6 (error isolation -- no cascade): Given one child provider throws synchronously instead of resolving per the soft-fail contract in provider-interface.mts, When CompositeProvider fans out a call, Then the throw is caught per-child and does not propagate to block a sibling provider's call or the caller -- evidenced by a test using a deliberately throwing mock provider alongside a working one, asserting the working provider's call still completes and returns its result.
