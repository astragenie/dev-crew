---
id: SLICE-191
title: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape
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
github_issue: 606
github_url: "https://github.com/astragenie/runner-plugin/issues/606"
---
# SLICE-191: Migrate proposed_slices_shipped frontmatter from index-prefix to per-id_suffix keyed shape

Implements FEAT-284. See [feature file](../../../backlog/in-progress/FEAT-284.md) for product context.

## Objective

**Scope corrected 2026-08-05 — the title is stale, read this before starting.**

The title says "migrate from index-prefix to per-id_suffix keyed shape". Checked
against the code: `feature-lifecycle.mts:271` already writes
`proposed_slices_shipped` as an array of `idSuffix` values (`["-SLICE-1", …]`),
not index prefixes. That migration is already done.

The real fragility is adjacent and still live: `proposed_slices_shipped` and
`proposed_slices_shipped_commits` (:271-272) are **two parallel arrays
correlated only by position**. Nothing structurally binds a slice to its
evidence commit. If the arrays ever differ in length or order — a partial write,
a hand edit, a future code path that appends to one and not the other — the
slice-to-commit mapping silently corrupts, and the corruption is invisible
because both arrays independently look well-formed.

That matters here specifically because these fields are the durable audit trail
for the FEAT-284 silent-drop incident. An audit trail whose two halves can
desynchronize without detection is the same defect class as the incident it
records.

## In scope

- `src/scripts/lib/slice-linker/feature-lifecycle.mts` — replace the two
  parallel arrays with a single structure that binds each `id_suffix` to its
  commit sha, so the pairing cannot desynchronize.
- A back-compat READ path: existing FEATs on disk carry the two-array shape
  (`FEAT-259`, `FEAT-284` and others). They must keep parsing correctly. Do not
  require a migration pass over the backlog before the code works.
- The write at :269-273 stays inside its existing try/catch and keeps the
  fail-open contract — an fs failure must not block the start.
- Tests: the legacy two-array shape reads correctly; the new shape round-trips;
  a deliberately desynchronized legacy pair (different lengths) is handled
  predictably rather than silently mispairing.

## Out of scope

- `materializeProposedSlices` index keying (`:521`) — that is SLICE-192, and it
  is the actual duplicate-slice bug. Do not fix it here.
- The CLI escape hatch — SLICE-193.
- The matcher in `git-anchored-completion.mts` — SLICE-194.
- Do not write a backlog migration script. Back-compat read is the requirement;
  rewriting existing FEAT files is a separate decision.

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
