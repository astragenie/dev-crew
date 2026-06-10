---
id: SLICE-12
status: completed
feature: FEAT-026
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-02
updated: 2026-06-02
completed_at: 2026-06-02
github_issue: 54
github_url: "https://github.com/sergeymilashico/loop/issues/54"
---
# SLICE-12: slice complete auto-detection of remaining slices — block premature FEAT roll to done/

Implements FEAT-026. See [feature file](../../../backlog/in-progress/FEAT-026.md) for product context.

## Objective

Today `slice complete` unconditionally rolls the parent FEAT from in-progress/ to done/ unless --keep-feature-open is passed. For multi-slice FEATs this is wrong: shipping SLICE-A of a 3-slice FEAT also marks the FEAT done, hiding SLICE-B+C work from the backlog.

## In scope

- Extend `scripts/lib/slice-linker/complete-slice.mjs::completeSlice` (and `src/scripts/lib/slice-linker/complete-slice.mts`):
  - On close: append `sliceId` to parent FEAT's `slices_complete` frontmatter array (create if missing, dedupe).
  - Compute `remaining = (slices ?? []) - (slices_complete ?? [])`.
  - If `remaining.length > 0`:
    - Skip `moveFeatureToDone` step.
    - Return `result.feature = { skipped: true, reason: 'multi-slice: <remaining> still pending', remainingSlices: [...], slicesComplete: [...] }` (mirror shape of existing `--keep-feature-open` skip).
  - If `remaining.length === 0` AND `keepFeatureOpen === false` AND `forceClose !== true`: existing roll-to-done behavior.
- Add `--force-close` flag (boolean) to `scripts/loop.mjs slice complete`:
  - When true: roll FEAT to done/ regardless of remaining slices.
  - Annotate frontmatter with `force_closed: true` and `slices_remaining_at_close: [...]` for audit.
- Update `commands/slice-complete.md`:
  - Document `slices` + `slices_complete` interaction.
  - Document `--force-close` vs `--keep-feature-open` semantics.
- Add unit tests in `src/tests/slice-complete-multi-slice.test.mts`:
  - Case 1: FEAT with `slices: [SLICE-A, SLICE-B]`, only SLICE-A done → FEAT stays triaged, `slices_complete: [SLICE-A]` appended, `skipped: true reason: 'multi-slice'`.
  - Case 2: Same FEAT after SLICE-B done → `slices_complete: [SLICE-A, SLICE-B]`, FEAT moves to done.
  - Case 3: `--force-close` on a multi-slice FEAT → moves to done with `slices_remaining_at_close` audit field.
  - Case 4: `--keep-feature-open` on a fully complete FEAT → stays triaged (existing behavior preserved).
  - Case 5: Single-slice FEAT (`slices: [SLICE-A]`) → moves to done immediately after SLICE-A close (default 1=1 behavior).

## Out of scope

- New top-level CLI command (this is a behavior fix in existing `slice complete`).
- Migrating any prior FEATs in done/ retroactively (the FEAT-006 + FEAT-025 revert was already done by hand).
- Auto-deriving `slices` from `slice from-feature` based on FEAT body — separate concern; agents edit `slices` array directly when planning multi-slice work.
- Touching `linkage.mjs` cross-link format.
- Migrating the spec-status auto-roll behavior (separate code path).

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and lint clean (`npm run lint`)
- [ ] AC-2: New unit tests in `src/tests/slice-complete-multi-slice.test.mts` cover the 5 cases listed above; all pass
- [ ] AC-3: Running `slice complete` on a FEAT with `slices: [SLICE-X, SLICE-Y]` after only SLICE-X done returns JSON with `feature.skipped: true`, `feature.reason` starting with `'multi-slice'`, and frontmatter for the FEAT has `slices_complete: [SLICE-X]` written
- [ ] AC-4: Running `slice complete --force-close` on the same FEAT moves it to `done/` with frontmatter showing `force_closed: true` and `slices_remaining_at_close: [SLICE-Y]`
- [ ] AC-5: `--keep-feature-open` and existing default behavior preserved (no regression in current 481 tests; total should be 486+ after new tests added)
- [ ] AC-6: `commands/slice-complete.md` updated to document new behavior; `node ./scripts/validate-manifests.mjs` passes
- [ ] AC-7: `git diff --exit-code scripts/` clean after `npm run build` (TS source matches compiled output)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-026 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
