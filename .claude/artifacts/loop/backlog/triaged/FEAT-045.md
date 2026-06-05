---
id: FEAT-045
status: triaged
priority: P2
category: tech-debt
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=5+ (inline prefix), derived_from=null → true"
---
# FEAT-045: Split auto-walker.mts gate helpers to walker-gates.mts (487 lines near 400-line convention)

auto-walker.mts is 487 lines, near the 400-line module convention. Gate helpers (compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate) are ~100 lines with no dependency on walker I/O — clean extraction to walker-gates.mts. walkCandidates and runAutoWalker stay in auto-walker.mts. Pre-empts a future convention violation as the walker grows. No behavior change. Acceptance criteria: AC-1: walker-gates.mts created with compareWalkerOrder, checkDependsOn, evaluateCandidate, evaluateRiskGate exported. AC-2: auto-walker.mts drops to under 400 lines. AC-3: all existing walker tests pass unchanged. AC-4: npm run typecheck clean.