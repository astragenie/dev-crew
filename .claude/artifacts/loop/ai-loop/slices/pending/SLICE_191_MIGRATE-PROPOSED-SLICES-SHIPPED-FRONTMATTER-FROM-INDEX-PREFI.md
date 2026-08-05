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

Scoped 2026-08-05 to this slice. The FEAT-level set is superseded here: ACs
1/2/6/7 shipped in SLICE-188/189, AC-3 in SLICE-190, AC-4/5 belong to
SLICE-192/193, AC-8 to SLICE-194. Note the FEAT's original AC-1 wording was
corrected on 2026-08-04 and the stale version has been removed rather than left
for a builder to act on.

- [ ] AC-1: Given a FEAT whose shipped evidence is recorded, when it is written, then each `id_suffix` is bound to its commit sha in one structure, so the pairing cannot desynchronize the way two positionally-correlated arrays can.
- [ ] AC-2: Given an existing FEAT on disk carrying the legacy two-array shape (`FEAT-259`, `FEAT-284` and others), when it is read, then the evidence parses correctly with no migration pass required first.
- [ ] AC-3: Given a legacy pair whose two arrays differ in length, when it is read, then the result is predictable and stated — never a silent mispairing of a slice to another slice's commit.
- [ ] AC-4: Given the new shape is written, when it is read back, then it round-trips unchanged.
- [ ] AC-5: Given an fs failure during the evidence stamp, when it occurs, then the fail-open contract at `:269-279` still holds and the advance verdict stands.
- [ ] AC-6: Full suite green; typecheck + lint + format clean.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- **FEAT-284 stays in `in-progress/`** unless this is the last open sibling — only the final slice moves the feature to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
