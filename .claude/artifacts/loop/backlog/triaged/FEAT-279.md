---
id: FEAT-279
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-03
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.5
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-04
autonomous_safe: false
triage_notes: "P2: hardens a real, structurally-identified failure mode (false-negative pause detection directly undercuts FEAT-275's whole purpose) but impact is currently unmeasured -- this repo has zero live skip-badge notes to validate the heuristic's actual error rate against, so this is preventive hardening, not a fix for an observed miss. Effort and dependency depth banded up from a typical hygiene fix because the badge write path is confirmed crew-side (crew mark-badge in crew-bridge.mts) -- the structured --pause-detected flag can't land purely in this repo; it needs either a crew-side change or an upstream request, mirroring FEAT-268's 'confirm-then-maybe-upstream' decomposition. pm_autonomous_safe: false because the cross-plugin surface and the open question of whether crew will accept the flag argue for a spike + human check-in before the wiring slice, not full unsupervised dispatch."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Skip-badge fallback-usage counter for the keyword heuristic
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-2
    title: "Spike: crew mark-badge write path + upstream-request feasibility check"
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-3
    title: Consume structured pause-detection signal from the badge write path
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-4
    title: Demote keyword heuristic to legacy fallback + deprecation tests
    points: 1
    estimated_tokens: 60000
p0_bucket: carry
p0_bucket_reason: "skip-badge pause-detection flag; the upstream-request spike (SLICE-2) becomes an in-repo change post-merge (cheaper), core flag work still carries"
---
## Description

Skip-badge pause detection relies on prose keyword inference; replace with an explicit flag. Raised as a non-blocking follow-up by the SLICE-178 re-review (FEAT-275, review artifact 20260803T200500Z). close-dispatch-telemetry.mts::noteIndicatesPause decides whether a gate skip-badge represents a real specialist pause (and therefore counts as dispatch telemetry) by keyword-matching the badge's free-text note against a fixed list: paus, no artifact, no handoff, stalled, idle, mid-sentence, did not return, no response. That list matches the current SOP Option-B note template in docs/sop/specialist-pause-handling.md, and correctly rejects policy-based skips such as a doc-only-slice waiver. The brittleness is structural, not a coding defect: real-world note phrasing drifts from the template, so a false negative silently UNDER-counts pauses (the exact failure class FEAT-275 exists to eliminate) and a false positive over-counts. There are currently no live skip-badge notes in this repo to validate the heuristic against, so its true error rate is unmeasured. Proposed fix: carry pause-detection as structured data rather than inferring it from prose -- e.g. an explicit --pause-detected flag (and optionally a --detection <no_artifact|scaffold_in_progress|mid_sentence> value) on the mark-badge / workflow-state gate write path, with the keyword heuristic retained only as a deprecated fallback for legacy badges written before the flag existed. Should also emit a counter when the fallback path fires, so the heuristic's real usage rate becomes observable instead of assumed. Depends on nothing; low risk; touches the crew-side badge writer contract, so check whether the flag needs an upstream request against dev-team before implementing.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a skip-badge note that trips noteIndicatesPause's keyword fallback, When the fallback path fires, Then a counter is emitted/recorded so the heuristic's real usage rate becomes observable instead of assumed (closes the unmeasured error rate gap called out in the FEAT).
- AC-2: Given the confirmed crew-side mark-badge write path (crew-bridge.mts:440-455), When a spike investigates whether an explicit --pause-detected (and optional --detection <kind>) flag can be added there, Then the finding is documented and, if crew-side changes are required, a docs/upstream-requests/ entry is filed against dev-team (same shape as the FEAT-268/SLICE-164 precedent).
- AC-3: Given a skip badge written with the new structured --pause-detected field present, When classifyGateForTelemetry / noteIndicatesPause processes it, Then it reads the structured field first and skips prose keyword-matching entirely for that badge.
- AC-4: Given a legacy skip badge written before the flag existed (no structured field present), When the same code path processes it, Then it falls back to the existing PAUSE_NOTE_KEYWORDS heuristic, preserving current behavior for old badges (deprecated-fallback requirement from the FEAT description).
- AC-5: Given the fallback path fires for a legacy badge under AC-4, When telemetry is recorded, Then the same usage counter from AC-1 increments, so the fallback's share of total skip-badge volume stays visible over time as legacy badges age out.

## Proposed slices (PM decomposition)

- SLICE-1: Skip-badge fallback-usage counter for the keyword heuristic (1 pts)
- SLICE-2: Spike: crew mark-badge write path + upstream-request feasibility check (1 pts)
- SLICE-3: Consume structured pause-detection signal from the badge write path (2 pts)
- SLICE-4: Demote keyword heuristic to legacy fallback + deprecation tests (1 pts)
