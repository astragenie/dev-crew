---
id: SLICE-25
title: Docs merge + CLAUDE.md <=12KB budget triage
status: pending
feature: FEAT-005
phase: null
priority: P2
target_release: null
requires_validation: true
risk: high
created: 2026-08-19
updated: 2026-08-19
effort_points: 1
proposed_slice_id_suffix: -SLICE-5
estimated_tokens: 60000
tags: ["stack:typescript"]
---
# SLICE-25: Docs merge + CLAUDE.md <=12KB budget triage

Implements FEAT-005. See [feature file](../../../backlog/in-progress/FEAT-005.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-005 and shared across 6 sibling slices — scope per-slice before close

- [ ] AC-1: Given the merged CI workflow is authored, When the full gate list runs on main, Then all ~30 gates exit 0 (CI green end-to-end).
- [ ] AC-2: Given the wiggin-term sweep gate is added, When it runs against the full merged tree (not just the P1 import diff), Then zero matches remain outside any explicitly archived parent-repo directory.
- [ ] AC-3: Given scripts/lib/gepa/ contains 27 files, When the import-closure trace (starting from gepa-eval/gepa-history/gepa-invalidate + the evals/ harness) runs, Then the disposition table names all 27 files individually as KEEP or DELETE -- a table covering fewer than 27 files fails this AC, and any file marked DELETE that is still imported by a kept command also fails it.
- [ ] AC-4: Given the merged CLAUDE.md must stay <=12KB pre-include, When `wc -c CLAUDE.md` (excluding @include expansions) runs after the docs-merge slice, Then the byte count is <=12288.
- [ ] AC-5: Given improve-cleanup.md's deletion inventory lists ~38 files, When the P4 slices close, Then every listed item has a recorded disposition (DELETE executed / ARCHIVE executed / MERGE executed / explicitly DEFERRED with a written reason) -- an item with no disposition record fails this AC.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-005 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
