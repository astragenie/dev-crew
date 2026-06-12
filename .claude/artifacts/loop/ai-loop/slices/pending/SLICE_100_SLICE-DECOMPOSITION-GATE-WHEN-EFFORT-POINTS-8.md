---
id: SLICE-100
title: "Decomposition gate: consume proposed_slices, atomic multi-slice create, idempotent rerun (FEAT-168 slice-c)"
status: pending
feature: FEAT-168
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-12
updated: 2026-06-12
---
# SLICE-100: Consume proposed_slices — atomic multi-slice + idempotent rerun (FEAT-168 slice-c)

Implements FEAT-168 **AC-4 + AC-5**. Parser landed in SLICE-99; gate + audit landed in SLICE-98; this slice wires the consumer.

## Objective

When a FEAT carries `proposed_slices[]` in frontmatter, `sliceFromFeature` MUST materialize one slice file per entry (titles + points from the proposal), allocate ids by scanning `slicesRoot`, cross-link them all into `feature.slices[]`, AND be idempotent on rerun (no duplicate slice files, no duplicate ids in `feature.slices[]`). When `proposed_slices` is absent, fall back to the existing single-slice path with zero behavior change.

## In scope

- `src/scripts/lib/slice-linker/feature-lifecycle.mts::sliceFromFeature`:
  - After `assertSized`, attempt `parseProposedSlices(sourceFM.proposed_slices, featureId, sourceFM.effort_points)`. If it returns `null` (no field), take the existing single-slice path. If it returns an array, take the new multi-slice path. If it throws `InvalidProposedSlicesError`, propagate the throw.
  - Multi-slice path:
    1. Read existing `featureFM.slices` array.
    2. If `existingSlices.length >= proposed.length`, return early with idempotent: true.
    3. Otherwise, allocate `proposed.length - existingSlices.length` fresh ids using `maxSliceIdUnder + offset`.
    4. For each fresh slice, write a slice file with title clamped via existing helper, embed `effort_points` in the slice frontmatter.
    5. Update `featureFM.slices` to append all newly allocated ids atomically (single `updateFeatureFrontmatter` call).
    6. Skip the classify step on the multi-slice path.
- Return shape: keep `out.slice` = first slice (back-compat), add `out.slices` listing all materialized slices in order. Single-slice path sets `out.slices = [out.slice]`.
- CLI `from-feature` handler: loop over `out.slices` for `publishSlice` calls and telemetry `logEvent`. Extend the existing catch to also audit-log `InvalidProposedSlicesError` with the same shape.

## Out of scope

- Multi-level nesting in YAML arrays.
- Sub-slice crash-safe filesystem operations (rerun-idempotent is the recovery contract).
- PM agent actually emitting `proposed_slices` (rule already in `agents/pm.md` from SLICE-98).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2 (FEAT AC-5 — atomic multi-slice create): Given a FEAT with `effort_points: 13` and a 3-entry `proposed_slices` array and no existing slices, when `sliceFromFeature` is invoked, then THREE slice files are written with the proposed titles, `feature.slices` is a 3-element array in proposal order, and `out.slices.length === 3`. Test `sliceFromFeature creates all proposed slices atomically`.
- [ ] AC-3 (FEAT AC-4 — idempotent rerun): Given the same FEAT with `feature.slices` already populated (rerun), when `sliceFromFeature` is invoked again, NO new slice files are written, `feature.slices` length unchanged, `out.idempotent === true`. Test `sliceFromFeature is idempotent on proposed_slices rerun`.
- [ ] AC-4 (malformed proposed_slices propagates + audit): Given a FEAT with a `proposed_slices` whose first entry has `points: 4`, when the CLI `from-feature` is invoked, then it exits 1 AND appends an audit entry shape matching the DecompositionRequiredError shape from SLICE-98 (`parentCommand: "slice from-feature"`, `error` mentions FEAT id, `ok: false`). Test `from-feature on malformed proposed_slices writes audit + exits 1`.
- [ ] AC-5 (single-slice path unchanged): Given a FEAT with `effort_points: 5` (no proposed_slices), `out.slices.length === 1`, `out.slice === out.slices[0]`. Test `single-slice path returns slices array of length 1`.

## Done When

- All AC PASS.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean.
- `bunx tsc --project tsconfig.json --noEmit` and `tsconfig.test.json --noEmit` clean.
- Final-synthesis artifact written.
- FEAT-168 moves to `done/`.

## Reviewer ladder

- Reviewer A (correctness): verify atomicity of the multi-slice `feature.slices` update (single write, not per-iteration); verify idempotency tolerates partial materialization (existing N of M slices — extend the rest, don't duplicate); verify malformed-proposed_slices catch doesn't double-log.
- Reviewer B (production-readiness): verify `publishSlice` loop tolerates a publish failure on slice N without aborting slice N+1; verify `out.slice` remains the FIRST slice for callers that read it; verify new slice files' frontmatter `effort_points` matches `ProposedSlice.points`.
