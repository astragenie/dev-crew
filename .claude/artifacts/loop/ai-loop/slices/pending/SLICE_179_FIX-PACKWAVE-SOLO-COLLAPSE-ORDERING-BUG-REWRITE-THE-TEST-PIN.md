---
id: SLICE-179
title: Fix packWave solo-collapse ordering bug + rewrite the test pinning it
status: pending
feature: FEAT-276
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-03
updated: 2026-08-03
effort_points: 2
estimated_tokens: 100000
github_issue: 587
github_url: "https://github.com/astragenie/runner-plugin/issues/587"
---
# SLICE-179: Fix packWave solo-collapse ordering bug + rewrite the test pinning it

Implements FEAT-276. See [feature file](../../../backlog/in-progress/FEAT-276.md) for product context.

## Objective

Wave mode is secretly sequential: touches_files is populated on only 11 percent of slices, so the wave planner never packs more than one slice per wave. Evidence (2026-08-03 sweep): only 18 of 171 completed slice files under .claude/artifacts/loop/ai-loop/slices/completed/ contain a touches_files key. src/scripts/lib/wave/planner.mts packs parallel slots by non-conflicting touches_files and falls back to reason 'missing_touches_files_solo_only' when the field is absent (planner.mts:51), so a slice with no declared touches runs alone. Consequence: loop.marathonRunner wave mode degrades silently to sequential dispatch -- every wave run during the 2026-08-02 cost-audit program dispatched exactly one slice, and the parallel-worktree machinery (dispatch-worktree, conflict.mts, merge ordering) was paid for but never exercised at width. This also invalidates any wall-clock comparison between wave mode and slice-build mode. Fix: (1) make /runner:start always populate touches_files during shape classification rather than best-effort -- start-slice.mts already writes the field but evidently leaves it empty on most paths, so identify and close the gaps; (2) provide a backfill path for existing slices; (3) surface packing width in wave telemetry so a solo-only wave is visible rather than silent; (4) consider a conservative inferred-touches fallback (from the FEAT's declared tags/paths) so a missing field degrades to a narrow guess instead of solo-only.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-276 and shared across 4 sibling slices — scope per-slice before close

- [ ] AC-1: Given ranked slice candidates where the FIRST-ranked candidate has missing touches confidence but one or more later-ranked candidates have clean declared/inferred paths with no conflicts among them, When packWave runs, Then those later non-conflicting candidates ARE packed into the wave — the wave is no longer collapsed to a single solo dispatch merely because the top-ranked candidate lacks touches confidence.
- [ ] AC-2: Given the existing test 'missing touches_files dispatched solo when picked is empty' (src/tests/wave/planner.test.mts:61-67), which currently pins the buggy collapse-and-break behavior as expected (p.size===1, S2 never considered), When the fix lands, Then that test is rewritten to assert the corrected behavior (the missing-confidence candidate is skipped, not solo-dispatched-with-break, when clean later candidates exist) — not merely supplemented alongside the old assertion.
- [ ] AC-4: Given a slice-authoring write path (architect-feature contract, PM proposedSlices, or /runner:start) produces a slice with no declared touches_files, When body-regex inference (the existing declared -> inferred -> missing fallback in touches-files.mts) also fails to match any path, Then closing the gap so genuinely conflict-relevant slices get real declared paths is prioritized over relying on the lower-confidence inferred/missing tiers.
- [ ] AC-5: Given a wave run packs N candidates, When the wave completes, Then wave telemetry reports the achieved packing width and, for each rejected candidate, the real reason (path conflict vs. missing-confidence) — distinct from the now-fixed 'poisoned by a leading missing-confidence candidate' failure mode, so operators can confirm solo-only waves are no longer caused by ranking order.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-276 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
