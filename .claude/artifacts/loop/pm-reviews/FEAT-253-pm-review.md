---
id: PM-REVIEW-FEAT-253
feature: FEAT-253
reviewed_at: 2026-07-09
pm_customer_impact: 0.5
pm_effort_estimate: 0.45
pm_strategic_alignment: 0.65
pm_technical_risk: 0.5
pm_dependency_depth: 0.45
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-253

## Demand Assessment

- **Evidence:** Program's whole-program acceptance criterion (plan line 219-220): 'Flipping taskStore.provider/providers between noop|github|linear|composite changes all publish+sync behavior, zero code edits' -- CompositeProvider is the only phase that realizes the providers: [...] array / dual-tracker case of that AC. Review finding 3 [MAJOR] independently flags partial-publish-failure invisibility as a real correctness gap this FEAT must close.

## Scope Challenge

- **Scope notes:** Smallest deliverable: CompositeProvider(providers[]) implementing TaskStoreProvider with per-child error isolation and the COND-B warn-distinguishing-not-configured-vs-failed behavior; the docs page split (BacklogStore vs TaskStoreProvider) can ship in the same slice since it's markdown-only. Hard-depends on FEAT-252 (LinearProvider) landing first since CompositeProvider's id-recording approach is fixed by FEAT-252's COND-B DEC -- cannot be scoped independently. No weak grade dimensions to target. No direct cost analog on disk for a fan-out/composite-provider pattern; scored from the effort table using FEAT-251 (0.35/3pts, single-module getProvider consumer) as a lower-bound anchor and FEAT-252 (0.7/8pts, new external integration) as an upper-bound anchor -- CompositeProvider composes two already-built providers with no new external calls, landing between them at 0.45.

## Scores

- customer_impact: 0.50
- effort_estimate: 0.45
- strategic_alignment: 0.65
- technical_risk: 0.50
- dependency_depth: 0.45

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Composes two already-existing providers (no new external dependency) but correctness-critical partial-failure semantics keep technical_risk at the top of the 0.3-0.5 band (0.5); hard-blocked on FEAT-252 (dependency_depth 0.45); realizes the program's dual-tracker AC -> P2.

## Risks

- Partial-failure warn behavior (COND-B) is the review's top MAJOR finding for this phase -- if the warn doesn't distinguish 'not configured' from 'configured but call failed', a github-ok/linear-fail scenario silently no-ops at Phase 5a close-time with zero operator signal, exactly the failure mode the review flagged.
- Blocked entirely until FEAT-252 lands and its COND-B DEC resolves the id-recording contract (map-return vs composite-owns-stamping) -- starting this FEAT before FEAT-252 closes risks building against a stamping approach that changes underneath it.
