---
id: SLICE-199
title: CI fixture-snapshot gate + DEC-071 write-up
status: pending
feature: FEAT-230
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-04
updated: 2026-08-04
effort_points: 2
estimated_tokens: 100000
github_issue: 616
github_url: "https://github.com/astragenie/runner-plugin/issues/616"
---
# SLICE-199: CI fixture-snapshot gate + DEC-071 write-up

Implements FEAT-230. See [feature file](../../../backlog/in-progress/FEAT-230.md) for product context.

## Objective

Architect design artifact:

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-230 and shared across 5 sibling slices — scope per-slice before close

**Backfilled 2026-08-06 (runner-plugin#630).** The generated ACs below were
truncated to each bullet's first physical line by an extractor bug — FEAT-230's
ACs wrap across multiple markdown lines and the extractor only captured the
first. Reconstructed in full from `FEAT-230.md`, byte-for-byte (mid-clause
truncation fixed, no wording changed) except for one correction: FEAT-230's
own AC-1 cites `react-engineering` as an example dead skill ID, but
`react-engineering` is LIVE — just nested under a subcategory — and the FEAT
misclassifies it by exactly the flat-lookup mistake it exists to fix (see
FEAT-230.md's "Corrected drift measurement" section). `vue-engineering`
(genuinely dead) is substituted below per that correction.

- [ ] AC-1: GIVEN a slice tagged `stack:csharp` + `concern:security`, WHEN the dispatcher resolves skills, THEN it returns only skill IDs that EXIST in the live crew catalog (no `csharp-pro`/`vue-engineering`-style dead IDs), matched to the task signals.
- [ ] AC-2: GIVEN a signal that maps to no available skill, WHEN resolving, THEN the resolver logs a clear "no matching skill for <signal>" and injects nothing for it — never a fabricated/dead ID (structural fix for the drift).
- [ ] AC-3: GIVEN a repo with presets present, WHEN the dispatcher resolves skills, THEN `preset.roles.*.skills` / `fe/be.skills` are NOT read as the skill source (grep proves no runtime read of preset skill lists in the dispatch path).
- [ ] AC-4: GIVEN the resolver output, WHEN a builder is dispatched, THEN the dispatch payload's skill block is compatible with what crew's `orchestrate-slice` consumes (contract preserved or jointly updated per the upstream-request).
- [ ] AC-5: A validation gate (CI + resolve-time) fails when a resolved/declared skill ID is absent from the live catalog.
- [ ] AC-6: Resolution is deterministic + explainable — a `--explain` (or log) shows which task signals selected which skills.
- [ ] AC-7: A DEC-* records the decommission-preset-skills decision + the live-catalog source + the task→skill mapping rules.
- [ ] AC-8: Full suite green; typecheck + lint + format clean; snapshot-freshness passes.

This slice's own scope (per FEAT-230.md's contract-landed decomposition): CI
fixture-snapshot gate + DEC-071 write-up — i.e. AC-5, AC-7, and the shared
AC-6/AC-8 are this slice's core; AC-1/AC-2 are SLICE-196's, AC-3 is
SLICE-197's, AC-4 is SLICE-198's. This is also the final slice in FEAT-230's
decomposition — its own "Done When" still moves the feature to `done/`.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-230 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
