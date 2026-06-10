---
id: SLICE-15
status: completed
feature: FEAT-024
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-02
completed_at: 2026-06-03
github_issue: 48
github_url: "https://github.com/sergeymilashico/loop/issues/48"
---
# SLICE-15: Ceremony hook migration + setup-task-store.mjs

Implements FEAT-024 SLICE-C (final). See [feature file](../../../backlog/in-progress/FEAT-024.md).

## Objective

Wire `loop github sync` and `loop github bootstrap` through `getProvider`, add
`task-store` CLI alias, create `setup-task-store.mjs` adopter script with
`--provider` flag. Completes FEAT-024 — provider interface is now live.

## Deliverables

1. `src/scripts/lib/task-store/setup-writer.mts` — `writeTaskStoreConfig(repoPath, provider)` library
2. `src/tests/task-store-setup-writer.test.mts` — 8 tests covering config writes, back-compat, validation
3. `scripts/setup-task-store.mjs` — CLI adopter script (`--provider github|noop|linear`)
4. `src/scripts/loop.mts` — `sync` + `bootstrap` routed through `getProvider`; `task-store` command alias; `--provider` flag

## Acceptance criteria (FEAT-024 full)

- [x] AC1: `scripts/lib/task-store/index.mjs` exports `getProvider` — PASS (SLICE-14)
- [x] AC2: GithubProvider passes existing tests — PASS (SLICE-13)
- [x] AC3: New provider = one new file under providers/ — PASS (SLICE-14)
- [x] AC4: Back-compat github block → GithubProvider — PASS (SLICE-14)
- [x] AC5: `setup-task-store.mjs --provider github` exists — PASS (this slice)
- [x] AC6: Lint clean, 522 tests pass — PASS

## Evidence

- `npm test`: 522/522 pass (baseline 514, +8 new)
- `npm run lint`: clean
- `node ./scripts/validate-manifests.mjs`: Manifests OK
- `requires_validation: false` — library + CLI script, test suite is validation
