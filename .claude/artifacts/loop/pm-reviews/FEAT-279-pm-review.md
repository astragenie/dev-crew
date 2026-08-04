---
id: PM-REVIEW-FEAT-279
feature: FEAT-279
reviewed_at: 2026-08-04
pm_customer_impact: 0.5
pm_effort_estimate: 0.55
pm_strategic_alignment: 0.7
pm_technical_risk: 0.35
pm_dependency_depth: 0.5
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-279

## Demand Assessment

- **Evidence:** Confirmed close-dispatch-telemetry.mts:67-95 (PAUSE_NOTE_KEYWORDS, noteIndicatesPause, detectionFromReason): an 8-keyword substring match decides whether a *_skipped workflow-state badge counts as a real pause. The module's own header states this repo has zero live skip-badge notes to validate the heuristic against. Confirmed the badge write path is crew-side, not loop-side: crew-bridge.mts:440-455 shows loop invokes `crew mark-badge --badge validation_skipped --note <reason>` as an external CLI call into the crew plugin.

## Scope Challenge

- **Scope notes:** Cannot land purely in this repo -- a structured --pause-detected flag requires either a crew-side change or an upstream request (mirrors FEAT-268 SLICE-4/164's 'confirm crew-side, file upstream ask if needed' precedent). Decomposed so the unblocked, purely-local value (fallback usage counter) ships regardless of the upstream outcome.

## Scores

- customer_impact: 0.50
- effort_estimate: 0.55
- strategic_alignment: 0.70
- technical_risk: 0.35
- dependency_depth: 0.50

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2: hardens a real, structurally-identified failure mode (false-negative pause detection directly undercuts FEAT-275's whole purpose) but impact is currently unmeasured -- this repo has zero live skip-badge notes to validate the heuristic's actual error rate against, so this is preventive hardening, not a fix for an observed miss. Effort and dependency depth banded up from a typical hygiene fix because the badge write path is confirmed crew-side (crew mark-badge in crew-bridge.mts) -- the structured --pause-detected flag can't land purely in this repo; it needs either a crew-side change or an upstream request, mirroring FEAT-268's 'confirm-then-maybe-upstream' decomposition. pm_autonomous_safe: false because the cross-plugin surface and the open question of whether crew will accept the flag argue for a spike + human check-in before the wiring slice, not full unsupervised dispatch.

## Risks

- none
