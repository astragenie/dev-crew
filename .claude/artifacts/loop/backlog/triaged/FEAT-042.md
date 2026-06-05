---
id: FEAT-042
status: triaged
priority: P2
category: bugfix
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
priority: P1
pm_customer_impact: 0.75
pm_effort_estimate: 0.90
pm_strategic_alignment: 0.85
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
pm_strategic_fit: 0.85
pm_risk_level: 0.15
composite_score: 0.81
composite_priority: P1
triage_notes: "PM scored 2026-06-05: trivial clamp in compareWalkerOrder (~5 LOC); live bug — FEAT-020 (score 6) corrupts sort on every walker run; 6 ACs; autonomous_safe=true (technical_risk 0.15, effort 0.90, dep_depth 0.05)."
---
# FEAT-042: Walker composite-score scale normalization

Walker numeric-sort breaks when legacy raw 0-9 composite scores coexist with current 0.0-1.0 PM formula scores. FEAT-020 had composite_score: 6 (raw) which sorted above all current-formula FEATs (max 1.0). Discovered when FEAT-020 (score 6) ranked above FEAT-040 (score 0.41) despite FEAT-040 being higher priority. Fix: walker should normalize or detect out-of-range scores before sort. Options: (a) clamp/normalize any score > 1.0 to 1.0, (b) detect legacy scale and re-normalize to 0-1 range by dividing by 9, (c) emit a warning and treat out-of-range scores as 0. Option (a) is safest — any score > 1.0 is definitionally off-scale for current formula. Acceptance criteria: AC-1: composite_score > 1.0 treated as out-of-range by walker. AC-2: out-of-range scores normalized to 1.0 (clamped) before sort. AC-3: FEAT with score 6 sorts below FEAT with score 0.9 (not above). AC-4: warning or skip-reason emitted when out-of-range score detected. AC-5: existing sort behavior unchanged for scores in 0.0-1.0 range. AC-6: tests cover mixed legacy/current score sets.