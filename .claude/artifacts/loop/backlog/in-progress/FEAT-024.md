---
id: FEAT-024
status: in-progress
priority: P1
category: infrastructure
target_release: null
created: 2026-06-02
updated: 2026-06-02
depends_on: []
slices: [SLICE-13, SLICE-14, SLICE-15]
slices_complete: [SLICE-13, SLICE-14, SLICE-15]
derived_from: null
triage_notes: "pre-declared 3 slices — A interface+GithubProvider (refactor, no behavior change), B NoopProvider+LinearProvider stub+loop.json taskStore resolver, C migrate ceremony hooks + setup-task-store.mjs"
started_at: 2026-06-02
---
# FEAT-024: Pluggable task-store backend — abstract GitHub/Linear/etc behind provider interface

Decouple task/plan/brainstorm persistence from any single vendor. Current github-sync layer is hardcoded to gh CLI + GitHub REST. Refactor into a provider-shaped interface so loop can switch to Linear, Jira, native filesystem, or any future tracker without touching ceremony code.

## Why

- GitHub is one of several viable trackers. Linear, Jira, Notion, native-md all valid.
- Today scripts/lib/github-sync.mjs + scripts/lib/github-sync/* directly couple ceremony hooks (slice start/complete) to gh CLI.
- bootstrapFromGithub and publishAll live as named exports; swapping vendors today = grep-and-replace plus risking ceremony regressions.
- loop.json already has a github block. Need a generalized 'taskStore' block: { provider: 'github' | 'linear' | 'fs', config: {...} }.

## Scope

1. Define provider interface (TypeScript-style contract in JSDoc or .mts):
   - publishFeature(feat) -> externalId
   - publishSlice(slice, parentExternalId) -> externalId
   - closeSlice(externalId, reason)
   - postSliceComment(externalId, body)
   - updateStatus(externalId, status)
   - syncPull(repoPath) -> { features, slices } (reverse sync)
   - bootstrap(repoPath) -> hydrate local FEATs from remote
2. Extract current github-sync.mjs implementation behind GithubProvider class implementing interface.
3. Stub LinearProvider with method signatures + 'not implemented' throws — proves shape.
4. NoopProvider for repos with taskStore.enabled = false.
5. Resolver in loop.json: read taskStore.provider, instantiate matching class.
6. Migrate ceremony hooks (slice start/complete) to call provider.* instead of direct github-sync imports.
7. Migrate setup-github-sync.mjs into setup-task-store.mjs that takes --provider flag.
8. Keep github block in loop.json as deprecated alias mapping to taskStore for one release.

## Out of scope

- Linear implementation (separate FEAT).
- UI for switching providers mid-project.
- Bidirectional state machine across providers.

## Acceptance criteria

- AC1: scripts/lib/task-store/index.mjs exports getProvider(config) returning concrete provider.
- AC2: GithubProvider passes all existing tests/github-sync.test.mjs assertions through provider interface.
- AC3: Adding a new provider requires only one new file under scripts/lib/task-store/providers/<name>.mjs.
- AC4: Existing repos with loop.json github block keep working without edits (back-compat shim).
- AC5: New repos adopt via setup-task-store.mjs --provider github (or --provider noop).
- AC6: Lint clean, all existing tests pass, plus new provider-interface contract tests.