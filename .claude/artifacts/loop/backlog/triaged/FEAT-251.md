---
id: FEAT-251
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-07-09
updated: 2026-07-10
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-10
autonomous_safe: true
triage_notes: "Contained getProvider call-site swap; re-grep reconfirmed all 4 anchors despite the plan's own noted line-number drift; technical_risk 0.35 sits at the top of the 0.3-0.5 band (one module, no schema change, explicit parity test required) — confirmed, not adjusted. Realizes the program's headline zero-code-edit provider-flip AC. P2 confirmed."
tags: [refactor, workflow]
needs_contract: false
needs_ux: false
---
## Description

Tracker-provider program Phase 2 — unify tracker path through getProvider. Route the three lifecycle auto-publish sites in loop.mts (backlog add ~1002, spec decompose ~1343, slice-from-feature ~1459 — re-grep anchors, they drift) plus the github setup|publish|feat-publish|status subcommands through getProvider() from src/scripts/lib/task-store/index.mts, instead of direct importGithubSync('github-sync.mjs') calls. Behavior must be identical for github-enabled repos (test). After this FEAT, taskStore.provider in loop.json is the single switch for ALL mirror traffic; only getProvider-resolved providers touch trackers. Independent of the BacklogStore refactor (publish path does not touch backlog-writer). Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a repo with `github.enabled: true` in loop.json and no `taskStore.provider` set (the back-compat branch in `getProvider`, task-store/index.mts:29-31), When the loop.mts auto-publish call sites (backlog-add ~815, spec-decompose ~1338, slice-from-feature ~1454) and the github setup|publish|feat-publish|status subcommand handler (~1893) execute, Then they resolve `getProvider(config, repoPath)` to a `GithubProvider` instance and produce output identical to the pre-refactor direct `importGithubSync("github-sync.mjs")` call path for the same fixture input -- evidenced by a behavior-parity test asserting matching mirror output/side effects across both code paths.
- AC-2: Given `taskStore.provider: "noop"` explicitly set, When any of the four migrated call sites executes, Then `getProvider` returns a `NoopProvider` and no `github-sync.mjs` network/gh-CLI call is made -- evidenced by a test asserting zero github-sync invocations when NoopProvider is resolved at each of the four sites.
- AC-3 (edge/error path): Given no `taskStore` config block exists and `github.enabled` is unset or false, When any migrated call site executes, Then `getProvider`'s default-branch fallback (task-store/index.mts) returns a `NoopProvider` silently -- no throw, no console error -- evidenced by a unit test covering the fully-unconfigured-repo case.
- AC-4 (regression guard): Given the four now-migrated call sites previously called `importGithubSync("github-sync.mjs")` directly, When the migration lands, Then a grep-based regression test asserts zero remaining direct `importGithubSync` calls in loop.mts outside of `getProvider`'s own `GithubProvider` implementation path -- evidenced by a `src/tests/*.mts` test asserting the call-site count via source grep.
- AC-5: Given `taskStore.provider: "github"` is explicitly set (not via the `github.enabled` back-compat branch), When the four migrated call sites run, Then `getProvider` resolves the identical `GithubProvider` behavior as the back-compat path per its documented resolution order (task-store/index.mts:10-14) -- evidenced by a test covering both resolution branches (explicit provider name vs `github.enabled` fallback) and asserting equivalent output.
