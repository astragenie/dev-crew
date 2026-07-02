---
id: FEAT-205
status: triaged
priority: P1
category: enhancement
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [cost-control, dispatch, refactor]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.38
pm_strategic_alignment: 0.75
pm_technical_risk: 0.45
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.3-0.5 (new policy-as-data pattern in repo, cross-module reach between wave planner and worktree dispatch, no persisted-data contract change, clean rollback). P1: same quantified-impact tier as FEAT-204 (top-10 #2, single-incident 20x median cost, recurring), low effort, independent."
---
# FEAT-205: Slice-shape-aware model tier routing

## Problem

Wave dispatch does not consult slice classification when selecting model
tier. FEAT-112/SLICE-115 was classified `shape: docs` ("no code changes,
no lint, no test surface" per its grade file) yet billed $121.25 of
$142.95 to opus — 20x the window's median slice cost.

## Acceptance hints

- Slices classified docs/trivial dispatch on the small/mid tier;
  classification is read before worktree dispatch in wave mode.
- Regression test: a SLICE-115-shaped fixture produces a dispatch
  instruction with no opus routing.
- Tier policy expressed as data (capability/shape -> tier map), not
  per-call-site conditionals (aligns with retrospective ADR-B).

## Evidence

- Retrospective F-02;
  grade `20260613T092310Z-feat112-slice115-grade.md:25-26,58-60`;
  cost report `20260613T094333Z-...feat112-slice115.md:6,39-41`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a slice classified shape: docs (per its grade file's classification, matching the SLICE-115/FEAT-112 precedent at 20260613T092310Z-feat112-slice115-grade.md:25-26), When wave mode builds the dispatch instruction before worktree dispatch, Then the tier-policy lookup (capability/shape -> tier map) selects the small/mid tier and the emitted dispatch instruction contains no model: opus routing.
- AC-2: Given a slice classified shape: feature with cross-module blast radius, When the same tier-policy lookup runs, Then it selects the opus (or configured high) tier, proving the map differentiates by classification rather than defaulting one way for all slices.
- AC-3: Given a slice with a missing or malformed shape classification field, When tier routing runs, Then it falls back to a documented default tier rather than throwing an unhandled exception, and the fallback path is covered by its own test.
- AC-4: Given the tier policy is expressed as data (a capability/shape -> tier map) rather than per-call-site conditionals, When a reviewer inspects the wave dispatch code path, Then no if (shape === "docs")-style literal branching exists outside the single map lookup, aligning with ADR-B's 'tier becomes data' decision.
- AC-5: Given a SLICE-115-shaped fixture (docs classification, opus-eligible cost profile), When the regression test runs the dispatch-instruction builder, Then the resulting instruction snapshot asserts absence of opus routing.
