---
id: SLICE-14
status: completed
feature: FEAT-024
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
---
# SLICE-14: NoopProvider + LinearProvider stub + getProvider resolver

Implements FEAT-024 SLICE-B. See [feature file](../../../backlog/in-progress/FEAT-024.md) for product context.

## Objective

Add NoopProvider (silent no-ops), LinearProvider stub (not-implemented throws), and
`getProvider(config, repoPath)` index resolver that reads `taskStore.provider` from
loop.json with back-compat `github.enabled` alias.

## Deliverables

1. `src/scripts/lib/task-store/providers/noop-provider.mts` — all 7 methods resolve silently
2. `src/scripts/lib/task-store/providers/linear-provider.mts` — all 7 methods throw "not implemented"
3. `src/scripts/lib/task-store/index.mts` — `getProvider(config, repoPath)` resolver
4. `src/tests/task-store-index.test.mts` — 14 tests covering all resolver paths

## Acceptance criteria

- [x] AC1: `scripts/lib/task-store/index.mjs` exports `getProvider(config, repoPath)` — PASS
- [x] AC2: NoopProvider all 7 methods resolve without throwing — PASS
- [x] AC3: LinearProvider stub all 7 methods throw "not implemented" — PASS
- [x] AC4: `taskStore.provider === 'github'` → GithubProvider — PASS
- [x] AC5: No config → NoopProvider default — PASS
- [x] AC6: `github.enabled === true` back-compat → GithubProvider — PASS
- [x] AC7: `taskStore.enabled === false` forces NoopProvider — PASS
- [x] AC8: 514 tests pass, lint clean, manifests valid — PASS

## Evidence

- `npm test`: 514/514 pass (baseline 500, +14 new)
- `npm run lint`: clean
- `node ./scripts/validate-manifests.mjs`: Manifests OK
- Review: APPROVED (all 8 ACs confirmed by independent reviewer)
- `requires_validation: false` — pure library code, test suite is the validation

## Reviewer ladder

- Reviewer A: crew:reviewer subagent — APPROVED
- Reviewer B: n/a (bounded change, full AC coverage in tests)
