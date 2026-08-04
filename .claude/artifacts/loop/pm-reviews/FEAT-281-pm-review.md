---
id: PM-REVIEW-FEAT-281
feature: FEAT-281
reviewed_at: 2026-08-04
pm_customer_impact: 0.75
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.85
pm_technical_risk: 0.6
pm_dependency_depth: 0.2
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-281

## Demand Assessment

- **Evidence:** Not speculative: three confirmed real instances of this exact defect class surfaced in a single 2026-08-03/04 session (FEAT-275's dead telemetry recorders, SLICE-182's unwired renderWaveTelemetry, FEAT-272's dead template token) despite each having passing unit tests and green CI. One instance (pause telemetry) already polluted loop-snapshot.md, which CLAUDE.md auto-loads fleet-wide every session — so the blast radius is already demonstrated, not hypothetical.

## Scope Challenge

- **Scope notes:** New validator only — do not fold in fixing the three already-discovered instances (those are closed under FEAT-275/SLICE-182/FEAT-272). Scope is: reference-graph scan of src/scripts/lib/**, allowlist mechanism, dynamic-import awareness, warn-tier-first rollout. Hard-fail promotion and CLAUDE.md gate-list renumbering for hard-fail tier are explicitly out of scope for this FEAT — land warn tier, let it run a triage cycle, promote later as its own follow-up so day-one false positives don't block CI.

## Scores

- customer_impact: 0.75
- effort_estimate: 0.65
- strategic_alignment: 0.85
- technical_risk: 0.60
- dependency_depth: 0.20

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: Highest strategic value of the three because it's the only one that prevents recurrence of a whole defect class rather than patching one instance, and the class has already manifested three times with a proven fleet-wide side effect. Effort and risk are both elevated relative to FEAT-282/283 because it's new static-analysis infrastructure, not a bugfix in existing logic, which is why it lands at P1 rather than P0 despite the strong demand evidence — the warn-tier-first design is a technical-risk mitigation, not a scope reduction, and should stay in the AC set.

## Risks

- Static reference-graph analysis over dynamic `await import(...)` call sites is inherently heuristic; author's own description flags this repo uses dynamic import heavily (close-slice.mts, loop.mts) and a naive grep produces false positives.
- If the warn-tier discipline is skipped and this ships hard-fail on day one, the existing unlisted backlog of legitimately test-only/public-API exports will block unrelated PRs — same failure mode this FEAT is meant to prevent, just moved one layer up.
- Allowlist mechanism itself becomes a new drift surface (stale entries mask real regressions) unless it's reviewed periodically.
