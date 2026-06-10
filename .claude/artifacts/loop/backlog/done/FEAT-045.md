---
id: FEAT-045
status: done
priority: P2
category: tech-debt
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: [SLICE-48]
derived_from: null
autonomous_safe: true
composite_score: 0.527
pm_customer_impact: 0.25
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.5
pm_technical_risk: 0.08
pm_dependency_depth: 0.05
triage_notes: "P2 tech-debt — 487 lines, gate helpers are I/O-free making extraction clean, pre-emptive hygiene"
started_at: 2026-06-05
slices_complete: [SLICE-48]
completed_at: 2026-06-05
github_issue: 98
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/98"
---
# FEAT-045: Split auto-walker.mts gate helpers to walker-gates.mts (487 lines near 400-line convention)

auto-walker.mts is 487 lines, near the 400-line module convention. Gate helpers (compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate) are ~100 lines with no dependency on walker I/O — clean extraction to walker-gates.mts. walkCandidates and runAutoWalker stay in auto-walker.mts. Pre-empts a future convention violation as the walker grows. No behavior change. Acceptance criteria: AC-1: walker-gates.mts created with compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate exported. AC-2: auto-walker.mts drops to under 400 lines. AC-3: all existing walker tests pass unchanged. AC-4: npm run typecheck clean.