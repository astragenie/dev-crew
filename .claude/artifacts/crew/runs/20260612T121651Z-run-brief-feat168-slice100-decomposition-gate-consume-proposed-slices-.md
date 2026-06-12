---
feature: FEAT-168
status: active
---
# Run Brief: FEAT168 SLICE100: Decomposition gate: consume proposed_slices, atomic multi-slice create, idempotent rerun (FEAT-168 slice-c)

- Created: 2026-06-12T12:16:51.980Z
- Tier: full
- Goal: When a FEAT carries `proposed_slices[]` in frontmatter, `sliceFromFeature` MUST materialize one slice file per entry (titles + points from the proposal), allocate ids by scanning `slicesRoot`, cross-link them all into `feature.slices[]`, AND be idempotent on rerun (no duplicate slice files, no duplicate ids in `feature.slices[]`). When `proposed_slices` is absent, fall back to the existing single-slice path with zero behavior change.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/feature-lifecycle.mts::sliceFromFeature`:
  - After `assertSized`
  - attempt `parseProposedSlices(sourceFM.proposed_slices
  - featureId
  - sourceFM.effort_points)`. If it returns `null` (no field)
  - take the existing single-slice path. If it returns an array
  - take the new multi-slice path. If it throws `InvalidProposedSlicesError`
  - propagate the throw.
  - Multi-slice path:
    1. Read existing `featureFM.slices` array.
    2. If `existingSlices.length >= proposed.length`
  - return early with idempotent: true.
    3. Otherwise
  - allocate `proposed.length - existingSlices.length` fresh ids using `maxSliceIdUnder + offset`.
    4. For each fresh slice
  - write a slice file with title clamped via existing helper
  - embed `effort_points` in the slice frontmatter.
    5. Updat
- Out Of Scope:
  - - Multi-level nesting in YAML arrays.
- Sub-slice crash-safe filesystem operations (rerun-idempotent is the recovery contract).
- PM agent actually emitting `proposed_slices` (rule already in `agents/pm.md` from SLICE-98).
- Planned Files: -
- Next Step: Begin implementation

