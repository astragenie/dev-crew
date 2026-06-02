---
id: SLICE-13
status: completed
feature: FEAT-024
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-02
updated: 2026-06-02
completed_at: 2026-06-02
---
# SLICE-13: Pluggable task-store backend — abstract GitHub/Linear/etc behind provider interface

Implements FEAT-024. See [feature file](../../../backlog/in-progress/FEAT-024.md) for product context.

## Objective

Decouple task/plan/brainstorm persistence from any single vendor. Current github-sync layer is hardcoded to gh CLI + GitHub REST. Refactor into a provider-shaped interface so loop can switch to Linear, Jira, native filesystem, or any future tracker without touching ceremony code.

## In scope

**SLICE-A of FEAT-024.** Define the provider interface and wrap existing github-sync behind a `GithubProvider` class. Zero behavior change for existing callers — back-compat preserved. Foundation for SLICE-14 (Noop/Linear stubs + resolver) and SLICE-15 (ceremony hook migration).

1. New directory `scripts/lib/task-store/` (+ `src/scripts/lib/task-store/` source mirror).
2. New file `src/scripts/lib/task-store/provider-interface.mts`:
   - JSDoc + TypeScript interface `TaskStoreProvider` declaring the 7 contract methods:
     - `publishFeature(feat) -> Promise<externalId>`
     - `publishSlice(slice, parentExternalId) -> Promise<externalId>`
     - `closeSlice(externalId, reason) -> Promise<void>`
     - `postSliceComment(externalId, body) -> Promise<void>`
     - `updateStatus(externalId, status) -> Promise<void>`
     - `syncPull(repoPath) -> Promise<{ features, slices }>`
     - `bootstrap(repoPath) -> Promise<{ features }>`
   - Export `TaskStoreProvider` type + JSDoc shape (so non-TS callers can implement).
3. New file `src/scripts/lib/task-store/providers/github-provider.mts`:
   - Class `GithubProvider implements TaskStoreProvider`.
   - Constructor: `(repoPath, config = {})` — stores both.
   - Each method delegates to the corresponding existing function in `scripts/lib/github-sync.mjs` or its sub-modules.
4. New file `src/tests/task-store-github-provider.test.mts`:
   - Test 1: constructor stores repoPath + config.
   - Test 2: each method is async and present (typeof check, ≥5 methods asserted).
   - Test 3: methods delegate to underlying github-sync exports (mock gh executor; assert one method call results in the right gh CLI invocation).
   - Test 4: missing gh CLI → methods return graceful no-op (mirror existing github-sync behavior).
5. No changes to:
   - `scripts/lib/github-sync.mjs` (existing exports preserved)
   - `scripts/lib/github-sync/*` sub-modules
   - ceremony hooks (still use direct github-sync imports until SLICE-15)
   - `loop.json` schema (taskStore block lands in SLICE-14)
   - CLI surface (no new commands this slice)

## Out of scope

- `NoopProvider`, `LinearProvider` stubs (SLICE-14)
- `getProvider(config)` resolver + `loop.json` `taskStore` block (SLICE-14)
- Migration of ceremony hooks to `provider.*` calls (SLICE-15)
- Migration of `scripts/loop.mjs github` subcommands (SLICE-15)
- `setup-task-store.mjs` adopter (SLICE-15)
- Back-compat shim aliasing `github` block to `taskStore` (SLICE-15)
- Actual Linear implementation (separate FEAT)

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`)
- [ ] AC-2: New file `src/scripts/lib/task-store/provider-interface.mts` exports a `TaskStoreProvider` TypeScript interface with all 7 methods from In scope
- [ ] AC-3: New file `src/scripts/lib/task-store/providers/github-provider.mts` exports class `GithubProvider`; each of the 7 methods is async and delegates to existing github-sync exports
- [ ] AC-4: New tests in `src/tests/task-store-github-provider.test.mts` cover ≥4 cases (constructor, methods-present, delegation, missing-gh graceful)
- [ ] AC-5: Existing `tests/github-sync.test.mjs` still passes unchanged — zero regression
- [ ] AC-6: `git diff --exit-code scripts/` clean after `npm run build` (TS source compiles cleanly to `scripts/lib/task-store/`)
- [ ] AC-7: `node ./scripts/validate-manifests.mjs` still passes (no manifest changes this slice)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-024 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
