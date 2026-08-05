---
feature: FEAT-284
status: active
---
# Run Brief: FEAT284 SLICE192: Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index

- Created: 2026-08-05T05:26:00.128Z
- Tier: full
- Goal: This is the duplicate-slice bug. `materializeProposedSlices` decides what to create purely by COUNT, never by identity.  `feature-lifecycle.mts:521`:  ```ts const startAt = Math.max(existingSlices.length, opts.startIndex ?? 0); ... const toCreate = proposed.slice(startAt);   // :549 ```  Consequence, reproduced live on 2026-08-04: FEAT-259 had ordinal 1 silently dropped while ordinals 2-5 materialized. Re-running `slice from-feature` saw `existingSlices.length === 4`, set `startAt = 4`, and crea
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/slice-linker/feature-lifecycle.mts` — key materialization off
  `id_suffix` identity
  - not `existingSlices.length`. Determine which proposed
  entries are already materialized by matching identity
  - then create exactly the
  missing ones
  - in any position.
- Fix the `:528` position-pairing so reported id/title/points come from a real
  identity match rather than array index.
- Preserve the idempotent-rerun guarantee: a second run with nothing missing
  must still create nothing and return `idempotent: true`.
- Preserve `startIndex` interoperability with `reconcileProposedSlicesStartIndex`
  (the git-anchored advance path) — it must not be silently broken or ignored.
- Out Of Scope:
  - - `proposed_slices_shipped` frontmatter shape — SLICE-191.
- The CLI escape hatch — SLICE-193 (it depends on this slice's keying).
- The matcher in `git-anchored-completion.mts` — SLICE-194.
- Do not change `planReconcileAction`'s refuse/advance/proceed semantics.
- Planned Files: -
- Next Step: Begin implementation

