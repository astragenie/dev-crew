---
id: SLICE-155
title: Implement FEAT-251
status: pending
feature: FEAT-251
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-07-10
updated: 2026-07-10
github_issue: 433
github_url: "https://github.com/astragenie/runner-plugin/issues/433"
touches_files:
  - src/scripts/loop.mts
  - src/scripts/lib/task-store/index.mts
  - src/tests/task-store-provider-routing.test.mts
---
# SLICE-155: Implement FEAT-251

Implements FEAT-251. See [feature file](../../../backlog/in-progress/FEAT-251.md) for product context.

## Objective

Tracker-provider program Phase 2 — unify tracker path through getProvider. Route the three lifecycle auto-publish sites in loop.mts (backlog add ~1002, spec decompose ~1343, slice-from-feature ~1459 — re-grep anchors, they drift) plus the github setup|publish|feat-publish|status subcommands through getProvider() from src/scripts/lib/task-store/index.mts, instead of direct importGithubSync('github-sync.mjs') calls. Behavior must be identical for github-enabled repos (test). After this FEAT, taskStore.provider in loop.json is the single switch for ALL mirror traffic; only getProvider-resolved providers touch trackers. Independent of the BacklogStore refactor (publish path does not touch backlog-writer). Source plan: .claude/artifacts/crew/runs/2026-07-09-tracker-provider-migration-prompt.md (v5).

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given a repo with `github.enabled: true` in loop.json and no `taskStore.provider` set (the back-compat branch in `getProvider`, task-store/index.mts:29-31), When the loop.mts auto-publish call sites (backlog-add ~815, spec-decompose ~1338, slice-from-feature ~1454) and the github setup|publish|feat-publish|status subcommand handler (~1893) execute, Then they resolve `getProvider(config, repoPath)` to a `GithubProvider` instance and produce output identical to the pre-refactor direct `importGithubSync("github-sync.mjs")` call path for the same fixture input -- evidenced by a behavior-parity test asserting matching mirror output/side effects across both code paths.
  Evidence: `src/tests/task-store-provider-routing.test.mts` (4 tests tagged `AC-1:`) — GithubProvider's new `publishFeatureById`/`publishSliceById`/`publishAll`/`syncMilestones` methods delegate to the identical `github-sync.mjs` functions the pre-refactor call sites used.
- [x] AC-2: Given `taskStore.provider: "noop"` explicitly set, When any of the four migrated call sites executes, Then `getProvider` returns a `NoopProvider` and no `github-sync.mjs` network/gh-CLI call is made -- evidenced by a test asserting zero github-sync invocations when NoopProvider is resolved at each of the four sites.
  Evidence: `src/tests/task-store-provider-routing.test.mts` (4 tests tagged `AC-2:`) assert zero `ghExec` calls.
- [x] AC-3 (edge/error path): Given no `taskStore` config block exists and `github.enabled` is unset or false, When any migrated call site executes, Then `getProvider`'s default-branch fallback (task-store/index.mts) returns a `NoopProvider` silently -- no throw, no console error -- evidenced by a unit test covering the fully-unconfigured-repo case.
  Evidence: `src/tests/task-store-provider-routing.test.mts` (4 tests tagged `AC-3:`) use `assert.doesNotReject` against a fully-unconfigured `config = {}`.
- [x] AC-4 (regression guard): Given the four now-migrated call sites previously called `importGithubSync("github-sync.mjs")` directly, When the migration lands, Then a grep-based regression test asserts zero remaining direct `importGithubSync` calls in loop.mts outside of `getProvider`'s own `GithubProvider` implementation path -- evidenced by a `src/tests/*.mts` test asserting the call-site count via source grep.
  Evidence: `src/tests/task-store-provider-routing.test.mts` test `"AC-4: loop.mts contains zero direct importGithubSync(...) call sites"` — greps `loop.mts`, asserts 0 matches and the loader import is gone.
- [x] AC-5: Given `taskStore.provider: "github"` is explicitly set (not via the `github.enabled` back-compat branch), When the four migrated call sites run, Then `getProvider` resolves the identical `GithubProvider` behavior as the back-compat path per its documented resolution order (task-store/index.mts:10-14) -- evidenced by a test covering both resolution branches (explicit provider name vs `github.enabled` fallback) and asserting equivalent output.
  Evidence: `src/tests/task-store-provider-routing.test.mts` (2 tests tagged `AC-5:`) `assert.deepEqual` explicit-provider vs back-compat output. This test drove a real fix: `GithubProvider._enabledConfig()` (in `github-provider.mts`) now forces `github.enabled: true` when calling the underlying `github-sync.mjs` functions, so its own legacy `isEnabled` gate can't double-gate and silently no-op a call that `getProvider()` already authorized.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-251 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
