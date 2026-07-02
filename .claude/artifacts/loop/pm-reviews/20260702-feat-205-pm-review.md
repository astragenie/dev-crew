# PM review: FEAT-205 (2026-07-02)

```json
{
  "featureId": "FEAT-205",
  "scores": {
    "customer_impact": 0.75,
    "effort_estimate": 0.38,
    "strategic_alignment": 0.75,
    "technical_risk": 0.45,
    "dependency_depth": 0.1
  },
  "compositePriority": "P1",
  "autonomousSafe": true,
  "demandEvidence": "FEAT body + retrospective F-02 (H/Strong): SLICE-115, classified shape: docs (grade file's own words: \"no code changes, no lint, no test surface\"), billed $121.25 of $142.95 to opus -- 20x the window's median slice cost. Stakeholder: cost-advisor + any operator relying on wave-mode cost predictability across mixed-shape waves; this recurs \"every wave with mixed slice shapes,\" not a one-off.",
  "scopeNotes": "Smallest deliverable: a capability/shape->tier map consulted before worktree dispatch, per ADR-B's explicit direction (\"tier routing becomes data ... today model is a hardcoded frontmatter literal\"). What I'd cut: extending the map beyond docs/trivial vs default -- start with the two-bucket case that reproduces SLICE-115, generalize later. Overlap check: none with FEAT-204 (different subsystem -- dispatch-time tier selection vs cost-report emission) though both land in Week 1 of the retrospective roadmap and are explicitly parallelizable. Effort calibration: same '4-8h' bracket as FEAT-204 per retrospective; scored marginally higher (0.38 vs 0.35) because it also requires introducing the map-as-data pattern itself (net-new structure) rather than just a dedup fix to existing logic -- no exact cost-report analog for this pattern, noted as 'no cost analog.'",
  "risks": [
    "It is two weeks later and this slice failed review: the map is added but the actual wave-dispatch call site that sets model: in the dispatch instruction isn't the one intercepted -- tier data exists but isn't consulted at the real decision point, exactly mirroring F-02's stated root cause ('wave dispatch doesn't consult slice classification').",
    "Rollback: revert-only if the tier map is purely additive config; if default-tier behavior changes for slices previously defaulting to opus, some legitimately complex 'docs-classified-but-actually-needs-opus' slices could regress in output quality until the map value is corrected -- a forward map-value fix, not necessarily a full revert.",
    "Coverage gap: no existing test currently pins 'a slice with shape: feature still gets opus' -- only the docs-under-routing case is asserted by the body's own AC -- without that companion assertion, a regression that routes everything to the small tier (over-correction) would pass CI silently."
  ],
  "reasoning": "Technical risk band 0.3-0.5 (new policy-as-data pattern in repo, cross-module reach between wave planner and worktree dispatch, no persisted-data contract change, clean rollback). P1: same quantified-impact tier as FEAT-204 (top-10 #2, single-incident 20x median cost, recurring), low effort, independent.",
  "acs": [
    "AC-1: Given a slice classified shape: docs (per its grade file's classification, matching the SLICE-115/FEAT-112 precedent at 20260613T092310Z-feat112-slice115-grade.md:25-26), When wave mode builds the dispatch instruction before worktree dispatch, Then the tier-policy lookup (capability/shape -> tier map) selects the small/mid tier and the emitted dispatch instruction contains no model: opus routing.",
    "AC-2: Given a slice classified shape: feature with cross-module blast radius, When the same tier-policy lookup runs, Then it selects the opus (or configured high) tier, proving the map differentiates by classification rather than defaulting one way for all slices.",
    "AC-3: Given a slice with a missing or malformed shape classification field, When tier routing runs, Then it falls back to a documented default tier rather than throwing an unhandled exception, and the fallback path is covered by its own test.",
    "AC-4: Given the tier policy is expressed as data (a capability/shape -> tier map) rather than per-call-site conditionals, When a reviewer inspects the wave dispatch code path, Then no if (shape === \"docs\")-style literal branching exists outside the single map lookup, aligning with ADR-B's 'tier becomes data' decision.",
    "AC-5: Given a SLICE-115-shaped fixture (docs classification, opus-eligible cost profile), When the regression test runs the dispatch-instruction builder, Then the resulting instruction snapshot asserts absence of opus routing."
  ]
}
```
