---
id: FEAT-035
status: pending
priority: P2
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: []
derived_from: SPEC-002
---
## Description

Cost reports for SLICE-23 through SLICE-28 all show `usd: 0` because the cost detector resolves `sourceProject` to `C--work-mega-hero-crew-autonomous-loop` (legacy path) instead of `C--work-mega-loop`. Until this is fixed every cost-reduction or cost-trend conclusion is unreliable for recent slices. SPEC-002 Theme B, issue #4.

## Acceptance hints

- Cost detector resolves `C--work-mega-loop` correctly when current project is the loop repo
- Legacy alias `C--work-mega-hero-crew-autonomous-loop` still resolves (for backward compat on older session data)
- Unit test asserts both paths resolve to the same accumulation bucket
- At least one historical cost report under `.claude/artifacts/crew/cost/2026060*.md` showing `usd: 0` re-resolves to non-zero when writer re-runs against current event window
- autonomous_safe: true (pure path normalization, no behavior change)

## Derived from

SPEC-002 (Reliability Hardening from Grade Followups), Theme B.
