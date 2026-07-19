---
id: PM-REVIEW-FEAT-237
feature: FEAT-237
reviewed_at: 2026-07-19
pm_customer_impact: 0.55
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.5
pm_technical_risk: 0.4
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-237

## Demand Assessment

- **Evidence:** Same defect class as GitHub #371, which the FEAT body itself describes as 'HIGH customer-facing' (phantom crew:builder shipped in installed loop rules). Direct quote: 'FEAT-236 SLICE-4 fixed the generated CLAUDE.md, but the templates are the install-time SOURCE — the next /runner:install ... regenerates the drift right back.' This is real installed-consumer-repo breakage evidence, not a hypothetical.

## Scope Challenge

- **Scope notes:** Depends conceptually on FEAT-236 (whose SLICE-4 already fixed the *generated* CLAUDE.md, per FEAT-236 verification above) but is independently scoped — its own `depends_on: []` is correct since the template source files are untouched by FEAT-236. No weak grade dimension is active (all last-5 averages >=0.80). Effort calibration: no clean single-slice cost analog for 'extend an existing regex-based validator with a negated/historical-context heuristic'; nearest structural precedent is validate-agent-refs.mts's own existing 'proximity-bounded dispatch-context heuristic' (cited in the FEAT's own Risks section) which this FEAT is asked to mirror, not invent from scratch — reduces novelty vs a from-scratch detector.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.45
- strategic_alignment: 0.50
- technical_risk: 0.40
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: P2, technical_risk 0.4 (0.3-0.5 band: new detection pattern within one existing module, no contract change, clean rollback) — extending validate-agent-refs.mts's existing heuristic rather than building a new validator from scratch keeps risk mid-band, not high.

## Risks

- The validator must allow legitimately historical/negated mentions (e.g. CLAUDE.md's own 'Backlog discipline' section narrating removed commands) — a naive blanket regex will false-positive on the very repo file that documents the removal, which would itself need an exemption or the CI gate breaks on its own source.
- Templates are consumed by every downstream repo running `/runner:install`; a residual stale command reference here reproduces the #371 customer-facing failure class on next install/refresh.
