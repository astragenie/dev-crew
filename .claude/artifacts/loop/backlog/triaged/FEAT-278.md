---
id: FEAT-278
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.7
pm_technical_risk: 0.15
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "P2: real, evidence-grounded completeness gap (confirmed by reading planner.mts -- the capacity guard bypasses the rejection-completeness invariant SLICE-179 established for the missing-confidence path) but narrow in blast radius -- wave mode's capacity guard rarely fires in practice (waveSize is normally sized to the backlog) and there is no demonstrated incident, unlike FEAT-268's active corruption. Low effort (single function, mirrors an already-reviewed pattern in the same file) and low risk (pure, deterministic, easily unit-tested) keep it a strong low-cost fix, capped below P1 by the narrow real-world trigger frequency. Pairs with FEAT-276 SLICE-182 (wave telemetry) as the consumer that surfaces these reasons -- not a blocking dependency, just a natural follow-on."
proposed_slices:
  - id_suffix: -SLICE-1
    title: "Wave packer: rejection-complete capacity guard + waveSize<=0 validation"
    points: 2
    estimated_tokens: 100000
---
## Description

packWave silently drops candidates when the waveSize guard fires: no rejection reason, invisible in telemetry. Found during SLICE-179 review (FEAT-276) and confirmed pre-existing, NOT a regression from that slice. In src/scripts/lib/wave/planner.mts the top-of-loop guard 'if (picked.length >= opts.waveSize) break;' is untouched by the SLICE-179 fix (verified as pure context on both sides of the diff). When it fires mid-loop, every remaining candidate in the ranked list is discarded without landing in either items or rejected -- so an operator reading the wave plan cannot distinguish 'there were only N candidates' from 'there were N+10 candidates and 10 were dropped for lack of slots'. Second symptom of the same gap: a waveSize of 0 or negative breaks on iteration 1 before anything is examined, so missingQueue stays empty, the SLICE-179 solo-guard correctly never fires, and the entire candidate list vanishes silently with no diagnostic at all. This is the same rejection-completeness principle SLICE-179 established for missing-confidence candidates (every candidate must end up in exactly one of items or rejected, never nowhere) -- it just was not extended to the capacity path, which was out of that slice's scope. Fix: push a rejection with a distinct reason (e.g. wave_full or capacity_exhausted, kept distinct from missing_touches_files_solo_only and from conflict reasons so telemetry can tell capacity pressure apart from specification gaps) for every candidate not examined once the wave is full, and validate/guard waveSize <= 0 explicitly rather than letting it degenerate into a silent empty plan. Pairs naturally with FEAT-276 SLICE-182 (wave telemetry: packing width + per-rejection reason), which is the consumer that would surface these.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given ranked.length > opts.waveSize, When packWave's capacity guard (if (picked.length >= opts.waveSize) break;) fires mid-loop, Then every candidate not yet examined is pushed to rejected with a distinct reason (e.g. capacity_exhausted), not silently omitted from both items and rejected.
- AC-2: Given opts.waveSize <= 0, When packWave runs, Then it does not silently degenerate into an empty plan with zero rejections -- every candidate in ranked is rejected under a capacity-family reason (or the function validates/guards waveSize explicitly up front before the loop).
- AC-3: Given a mixed ranked list containing both missing-confidence candidates and well-specified candidates that don't fit because the wave is already full, When packWave completes, Then every candidate ends up in exactly one of items or rejected -- capacity-drop reasons stay distinguishable from conflict_with_* and missing_touches_files_solo_only in the returned WavePlan.
- AC-4: Given the new capacity rejection reason, When a new unit test in the wave-planner test suite runs with ranked.length > waveSize, Then it asserts both the count and the exact reason string of the dropped-for-capacity rejections (mirroring the existing missing_touches_files_solo_only test coverage pattern).

## Proposed slices (PM decomposition)

- SLICE-1: Wave packer: rejection-complete capacity guard + waveSize<=0 validation (2 pts)
