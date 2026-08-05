---
id: FEAT-276
status: done
priority: P1
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-04
depends_on: []
slices: [SLICE-179, SLICE-180, SLICE-181, SLICE-182]
derived_from: null
pm_customer_impact: 0.7
pm_effort_estimate: 0.62
pm_strategic_alignment: 0.75
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
pm_reviewed: 2026-08-03
autonomous_safe: false
triage_notes: "P1 (unchanged tier, revised composition): customer_impact (0.7) and strategic_alignment (0.75) are unchanged — wave mode's core value proposition is still silently defeated and this is still a flagship-differentiator surface. effort_estimate drops from 0.78/13pts to 0.62/8pts and technical_risk from 0.65 to 0.6 now that the root cause is a precisely-diagnosed, small-blast-radius ordering bug in one function rather than an assumed epic-wide writer overhaul — the remaining decomposition below is leaner (4 slices, 8 points) than originally filed."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Fix packWave solo-collapse ordering bug + rewrite the test pinning it
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-2
    title: "Regression fixtures: mixed-confidence packing is order-independent"
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Improve declared touches_files coverage at slice-creation writers
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: "Wave telemetry: packing width + per-rejection reason (conflict vs missing)"
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-03
github_issue: 592
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/592"
slices_complete: [SLICE-179, SLICE-180, SLICE-181, SLICE-182]
completed_at: 2026-08-04
---
## Correction — 2026-08-05, AC-4 close record re-verified (SLICE-204 / FEAT-288)

AC-4 read: "Given a slice-authoring write path ... produces a slice with no
declared touches_files, When body-regex inference also fails, THEN closing
the gap so genuinely conflict-relevant slices get real declared paths is
prioritized over relying on the lower-confidence inferred/missing tiers."
This FEAT was closed 2026-08-04 with AC-4 recorded satisfied via SLICE-181.
Re-verified per SLICE-204 — the answer differs depending on which claim is
being asked about, so stating each separately rather than one verdict:

- **Write path alone: satisfied, and remains so.** SLICE-181 gave
  `buildSliceMarkdown`/`createSlice` (`slice-store.mts`) a real writer that
  declares non-empty resolved paths, correctly gated against clobbering an
  empty resolution. Reviewer PASS (`20260803T203000Z-review-result-slice-181-*`)
  independently re-ran 65 tests covering this. True then, true now.
- **Round trip (write → disk → read back): NOT satisfied at close time.**
  The review's "idempotency" verification (item 3) exercised
  `readTouchesFiles` against directly-constructed JS arrays, never against
  an actual markdown file produced by the real writer. The one on-disk case
  that did go through both halves — SLICE-187 — proved the gap the next day:
  `slice-store.mts` serializes to an inline YAML array
  (`touches_files: [a, b, c]`), and `wave/touches-files.mts` parsed
  block-style lists only, so it read back `confidence: "missing"` — the
  opposite of "declared." Found 2026-08-04 by builder-187, fixed 2026-08-05
  by SLICE-203 (commit `1b3eab6e`). So for the ~18 hours between this FEAT's
  close and SLICE-203 landing, AC-4's mechanism was dead on arrival for any
  slice actually using the writer's real output format.
- **Today (post-SLICE-203): satisfied, but only in a vacuous sense — not
  ticking it as a clean PASS.** The write→read mechanism now demonstrably
  works (real writer/reader round-trip test, SLICE-203). But measured: 0 of
  28 pending slices and 0 FEAT `proposed_slices` entries declare
  `touches_files` at all — `agents/pm.md` instructs the PM to omit the field
  "when unsure," and no other in-repo writer supplies a resolved value for
  an ordinary FEAT. So the mechanism is correct and tested, but nothing in
  the live backlog exercises it; the outcome AC-4 was actually chasing
  (conflict-relevant slices carrying real declared paths so wave packing
  works) does not hold today. That producer gap is tracked separately as
  FEAT-292 — out of scope here, not backfilled by this correction.

**Verdict:** AC-4's write-path claim was and is true. Its round-trip claim
was false at close and is now true structurally but vacuous in practice.
Not reopening this FEAT or touching AC-1/2/3/5 — this note corrects AC-4's
record only.

## Description

Wave mode is secretly sequential: touches_files is populated on only 11 percent of slices, so the wave planner never packs more than one slice per wave. Evidence (2026-08-03 sweep): only 18 of 171 completed slice files under .claude/artifacts/loop/ai-loop/slices/completed/ contain a touches_files key. src/scripts/lib/wave/planner.mts packs parallel slots by non-conflicting touches_files and falls back to reason 'missing_touches_files_solo_only' when the field is absent (planner.mts:51), so a slice with no declared touches runs alone. Consequence: loop.marathonRunner wave mode degrades silently to sequential dispatch -- every wave run during the 2026-08-02 cost-audit program dispatched exactly one slice, and the parallel-worktree machinery (dispatch-worktree, conflict.mts, merge ordering) was paid for but never exercised at width. This also invalidates any wall-clock comparison between wave mode and slice-build mode. Fix: (1) make /runner:start always populate touches_files during shape classification rather than best-effort -- start-slice.mts already writes the field but evidently leaves it empty on most paths, so identify and close the gaps; (2) provide a backfill path for existing slices; (3) surface packing width in wave telemetry so a solo-only wave is visible rather than silent; (4) consider a conservative inferred-touches fallback (from the FEAT's declared tags/paths) so a missing field degrades to a narrow guess instead of solo-only.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given ranked slice candidates where the FIRST-ranked candidate has missing touches confidence but one or more later-ranked candidates have clean declared/inferred paths with no conflicts among them, When packWave runs, Then those later non-conflicting candidates ARE packed into the wave — the wave is no longer collapsed to a single solo dispatch merely because the top-ranked candidate lacks touches confidence.
- AC-2: Given the existing test 'missing touches_files dispatched solo when picked is empty' (src/tests/wave/planner.test.mts:61-67), which currently pins the buggy collapse-and-break behavior as expected (p.size===1, S2 never considered), When the fix lands, Then that test is rewritten to assert the corrected behavior (the missing-confidence candidate is skipped, not solo-dispatched-with-break, when clean later candidates exist) — not merely supplemented alongside the old assertion.
- AC-3 (verification method, edge case): Given this repo currently cannot exercise `wave plan` end-to-end against real pending slices in a way that reliably reproduces the poison-pill ordering (verified: a live run returned size:0 at time of scoring), When this FEAT is validated, Then verification uses constructed SliceCandidate fixtures (mirroring planner.test.mts's existing pattern) with a missing-confidence candidate deliberately ranked first — a builder/validator citing a live `wave plan` run against this repo's current state as evidence is not acceptable.
- AC-4: Given a slice-authoring write path (architect-feature contract, PM proposedSlices, or /runner:start) produces a slice with no declared touches_files, When body-regex inference (the existing declared -> inferred -> missing fallback in touches-files.mts) also fails to match any path, Then closing the gap so genuinely conflict-relevant slices get real declared paths is prioritized over relying on the lower-confidence inferred/missing tiers.
- AC-5: Given a wave run packs N candidates, When the wave completes, Then wave telemetry reports the achieved packing width and, for each rejected candidate, the real reason (path conflict vs. missing-confidence) — distinct from the now-fixed 'poisoned by a leading missing-confidence candidate' failure mode, so operators can confirm solo-only waves are no longer caused by ranking order.

## Proposed slices (PM decomposition)

- SLICE-1: Fix packWave solo-collapse ordering bug + rewrite the test pinning it (2 pts)
- SLICE-2: Regression fixtures: mixed-confidence packing is order-independent (2 pts)
- SLICE-3: Improve declared touches_files coverage at slice-creation writers (2 pts)
- SLICE-4: Wave telemetry: packing width + per-rejection reason (conflict vs missing) (2 pts)
