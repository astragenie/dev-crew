---
id: SLICE-192
title: "Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index"
status: pending
feature: FEAT-284
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 2
estimated_tokens: 100000
github_issue: 608
github_url: "https://github.com/astragenie/runner-plugin/issues/608"
---
# SLICE-192: Rewrite materializeProposedSlices to key off id_suffix, not existingSlices.length prefix index

Implements FEAT-284. See [feature file](../../../backlog/in-progress/FEAT-284.md) for product context.

## Objective

This is the duplicate-slice bug. `materializeProposedSlices` decides what to
create purely by COUNT, never by identity.

`feature-lifecycle.mts:521`:

```ts
const startAt = Math.max(existingSlices.length, opts.startIndex ?? 0);
...
const toCreate = proposed.slice(startAt);   // :549
```

Consequence, reproduced live on 2026-08-04: FEAT-259 had ordinal 1 silently
dropped while ordinals 2-5 materialized. Re-running `slice from-feature` saw
`existingSlices.length === 4`, set `startAt = 4`, and created `proposed[4]` —
ordinal 5 — **a second time**. That produced a duplicate slice file and an
extra published GitHub issue (#598). The missing ordinal 1 stayed missing,
because a count-based cursor cannot express "there is a hole at position 0".

**Second symptom, found 2026-08-05 while scoping — not in the original report.**
The idempotent-rerun path at `:528` pairs existing slice ids to proposed entries
by POSITION:

```ts
existingSlices.slice(0, proposed.length).map((sid, i) => ({
  id: sid, title: proposed[i]!.title, points: proposed[i]!.points, ...
}))
```

When `existingSlices` order does not correspond to `proposed` order — exactly
what a gap or an out-of-order materialization produces — this reports real slice
ids under the wrong titles, points and token estimates. It is silent: the output
is well-formed and wrong. Fixing the cursor without fixing this leaves a
mislabeling path behind.

## In scope

- `src/scripts/lib/slice-linker/feature-lifecycle.mts` — key materialization off
  `id_suffix` identity, not `existingSlices.length`. Determine which proposed
  entries are already materialized by matching identity, then create exactly the
  missing ones, in any position.
- Fix the `:528` position-pairing so reported id/title/points come from a real
  identity match rather than array index.
- Preserve the idempotent-rerun guarantee: a second run with nothing missing
  must still create nothing and return `idempotent: true`.
- Preserve `startIndex` interoperability with `reconcileProposedSlicesStartIndex`
  (the git-anchored advance path) — it must not be silently broken or ignored.

## Acceptance evidence required

- A regression test reproducing the live shape: ordinals 2-5 materialized,
  ordinal 1 absent. Re-running must create ordinal 1 and must NOT create a
  second copy of any existing ordinal. Assert both halves — the observed bug was
  a duplicate, but the un-filled hole is the part that loses work.
- A test asserting `:528`'s reported titles match the actual slice identities
  for a gapped feature, not the positional pairing.

## Out of scope

- `proposed_slices_shipped` frontmatter shape — SLICE-191.
- The CLI escape hatch — SLICE-193 (it depends on this slice's keying).
- The matcher in `git-anchored-completion.mts` — SLICE-194.
- Do not change `planReconcileAction`'s refuse/advance/proceed semantics.

## Acceptance criteria

> WARNING: ACs copied from FEAT-284 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given a candidate commit whose subject/body matches a proposed slice's FEAT-id/SLICE-ordinal token pair, When reconcileProposedSlicesAgainstGit evaluates it, Then the commit is only recorded as shipped evidence if it actually changed at least one file — a docs-only or --allow-empty commit (reproducing 71604bb4) must never produce shipped evidence, verified by a NEW fixture that creates a real file-touching commit alongside the existing empty-commit case in the same test.
- [ ] AC-2: Given a proposed slice declares touches_files, When a diff-corroborated candidate commit's changed paths share zero overlap with that list, Then the match is downgraded to a text-only warning and reported to the operator rather than recorded as shipped evidence that advances the start index.
- [ ] AC-3: Given any proposed slice is skipped or downgraded during a reconcile pass, When runner:start / slice from-feature runs, Then an explicit operator-visible line is printed naming the ordinal, the slice title, and the matched commit sha, so the FEAT-284 repro (SLICE-1 dropped via commit 71604bb4) surfaces a visible warning instead of silence.
- [ ] AC-4: Given a FEAT whose proposed_slices had ordinal 1 skipped while ordinals 2-5 are already materialized (the live FEAT-259 state), When slice from-feature is re-run, Then it materializes the missing ordinal 1 and does not create a duplicate of any already-materialized ordinal — a regression test must reproduce the observed duplicate -SLICE-5 + redundant GitHub issue and assert it no longer occurs.
- [ ] AC-5: Given an operator needs to repair a gapped FEAT by hand, When they invoke the new CLI escape hatch targeting a specific id_suffix, Then that exact proposed slice is materialized regardless of index position, without requiring direct BacklogStore API calls (the actual repair path used in the FEAT-284 live repro).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-284 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
