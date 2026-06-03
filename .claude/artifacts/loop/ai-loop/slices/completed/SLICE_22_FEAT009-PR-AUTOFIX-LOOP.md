---
id: SLICE-22
status: completed
feature: FEAT-009
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
---
# SLICE-22: FEAT-009 — Autonomous PR autofix loop with circuit breaker

## Objective

New `loop pr-fix --pr N` command: poll PR via gh CLI, categorize issues
(ci_failure, lint, test_failure, review_comment, security), emit fix plans
with circuit breaker (max 3 attempts per category).

## Deliverables

1. `src/scripts/lib/pr-fixer.mts` — `fetchPrStatus`, `categorizePrIssues`, `runPrFix`
2. `src/scripts/loop.mts` — `pr-fix` subcommand + `--pr` flag
3. `commands/pr-fix.md` — command skill documentation
4. `src/tests/pr-fixer.test.mts` — 6 tests

## Evidence

- `npm test`: 555/555 pass (+6 new)
- `npm run lint`: clean, zero warnings
- Review: APPROVED (lead review)
- `requires_validation: false`
