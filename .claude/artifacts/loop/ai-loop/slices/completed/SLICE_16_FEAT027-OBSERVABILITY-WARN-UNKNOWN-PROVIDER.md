---
id: SLICE-16
status: completed
feature: FEAT-027
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
---
# SLICE-16: FEAT-027 — Observability: warn unknown provider, log resolved

## Objective

Clear the score-trend stop alert by addressing observability gaps in the
task-store provider layer: warn on unknown provider names, log resolved
provider at sync/bootstrap call sites.

## Deliverables

1. `src/scripts/lib/task-store/index.mts` — `console.warn` in `getProvider` default case when `providerName` is defined but unrecognised
2. `src/scripts/loop.mts` — `console.log("[task-store] provider: …")` before `syncPull`/`bootstrap` calls; sync+bootstrap branches merged for DRY
3. `src/tests/task-store-index.test.mts` — 3 new tests: warn fires for unknown, no warn for explicit noop, no warn for unconfigured default

## Acceptance criteria

- [x] AC1: `getProvider({ taskStore: { provider: "jira" } })` → warns with `[task-store]` prefix — PASS (test)
- [x] AC2: `getProvider({ taskStore: { provider: "noop" } })` → no warning — PASS (test)
- [x] AC3: `getProvider({})` → no warning — PASS (test)
- [x] AC4: `loop github sync` logs resolved provider name — PASS (code)
- [x] AC5: 525 tests pass, lint clean — PASS

## Evidence

- `npm test`: 525/525 pass (baseline 522, +3 new)
- `npm run lint`: clean
- Review skipped: 2-line change + 3 targeted tests, bounded single-file
- `requires_validation: false` — library change, test suite is validation
