---
phase: "3"
feature: FEAT-069
---
# Run Brief: PHASE3 FEAT069 SLICE71

- Created: 2026-06-07T09:39:20.354Z
- Goal: Delete four one-shot migrator source modules and their test files, then remove the caller helpers that referenced them from `loop-installer.mts`. This is the final Phase A slice — after A3, FEAT-069 is complete.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - Delete these source files:
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
- Remove `appendLegacyMigrationWrite
- Out Of Scope:
  - - Any changes to `auto-dispatch.mts` (SLICE-70 complete)
- Any changes to `marker-drain.mts` (SLICE-69 complete)
- Phase B or Phase C work
- Planned Files: -
- Next Step: Begin implementation

