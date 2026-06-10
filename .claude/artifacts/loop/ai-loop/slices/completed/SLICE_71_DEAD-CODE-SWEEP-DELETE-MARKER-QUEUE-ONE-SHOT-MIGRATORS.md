---
id: SLICE-71
status: completed
feature: FEAT-069
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [refactor, infra]
needs_contract: false
needs_ux: false
skip: [architect, uxdesigner]
completed_at: 2026-06-07
github_issue: 147
github_url: "https://github.com/sergeymilashico/loop/issues/147"
---
# SLICE-71: A3 — delete one-shot migrators + caller cleanup in loop-installer

Implements FEAT-069 Phase A3. See [feature file](../../../backlog/in-progress/FEAT-069.md) for product context.

## Objective

Delete four one-shot migrator source modules and their test files, then remove
the caller helpers that referenced them from `loop-installer.mts`. This is the
final Phase A slice — after A3, FEAT-069 is complete.

## In scope

Delete these source files:
- `src/scripts/lib/adhoc-migrator.mts` + compiled `scripts/lib/adhoc-migrator.mjs`
- `src/scripts/lib/legacy-migrator.mts` + compiled `scripts/lib/legacy-migrator.mjs`
- `src/scripts/lib/codemod-add-any.mts` + compiled `scripts/lib/codemod-add-any.mjs`
- `src/scripts/lib/migrate-product-backlog.mts` + compiled `scripts/lib/migrate-product-backlog.mjs`

Delete these test files:
- `src/tests/adhoc-migrator.test.mts` (if exists) + compiled `tests/adhoc-migrator.test.mjs`
- `src/tests/legacy-migrator.test.mts` (if exists) + compiled `tests/legacy-migrator.test.mjs`
- Any other test files that exclusively test the above four modules

Modify `src/scripts/lib/loop-installer.mts`:
- Remove `migrateLegacyAutonomousLoop` call and import
- Remove `appendLegacyMigrationWrites` helper (if present in this file)
- Remove `runAdhocMigration` helper (if present in this file)
- Remove any other imports that reference the deleted modules
- Keep all remaining `loop-installer.mts` functionality intact

Recompile: `npm run build` to sync `.mjs` artifacts.

## Out of scope

- Any changes to `auto-dispatch.mts` (SLICE-70 complete)
- Any changes to `marker-drain.mts` (SLICE-69 complete)
- Phase B or Phase C work

## Acceptance criteria

- [ ] AC-1: All four source modules deleted: `adhoc-migrator.mts`, `legacy-migrator.mts`, `codemod-add-any.mts`, `migrate-product-backlog.mts`
- [ ] AC-2: Paired test files for deleted modules deleted (if they existed)
- [ ] AC-3: `src/scripts/lib/loop-installer.mts` has no import/call referencing any deleted module
- [ ] AC-4: `npm run typecheck` exits 0
- [ ] AC-5: `npm run lint` exits 0, zero warnings
- [ ] AC-6: `npm test` exits 0; test-count drop matches deleted test cases
- [ ] AC-7: `npm run build` exits 0; compiled `.mjs` artifacts match deleted sources (no stale `.mjs` for deleted modules)

## Done When

- all ACs PASS with evidence
- `requires_validation: false` waives validation gate (pure dead-code deletion)
- FEAT-069 can be closed (final A slice)

## Reviewer ladder

- Reviewer A: crew:reviewer
- Reviewer B: n/a (mechanical delete)
