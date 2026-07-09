---
id: PM-REVIEW-FEAT-254
feature: FEAT-254
reviewed_at: 2026-07-09
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.6
pm_technical_risk: 0.45
pm_dependency_depth: 0.65
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-254

## Demand Assessment

- **Evidence:** Plan hook (c) states explicit purpose: 'Gives astrarunner issue open->close timestamps for lead-time/MTTR' -- direct DORA-consumer demand. Hook (b) states 'FEAT-242's watcher reactions calling intake --from-issue make Linear issues watchable findings with zero watcher changes' -- a second in-repo FEAT (FEAT-242's reactions) gets free value from this one. Lessons digest (bun src/scripts/loop.mts lessons recent 5, last 5 slice grades) has no entries naming issue-close hooks or --from-issue directly, so this demand is plan-evidenced, not lesson-evidenced.

## Scope Challenge

- **Scope notes:** Three separable hooks (close-comment+close, --from-issue Linear support, issue.published/closed events) but explicitly gated: 'SEQUENCING: queue until FEAT-242 (B1) slices close -- shared envelope/fanout surface' and depends_on FEAT-251 + FEAT-252 for the getProvider path and LinearProvider respectively. Event emission MUST copy the landed PR #406 pattern exactly (dedicated <kind>-emitter.mts, schema under schemas/loop-events/ + index.json, fanoutEnvelope sink, no-op without webhook config, canonical ts field) -- a known template reduces effort/risk versus greenfield design. No weak grade dimensions to target. No cost analog for this exact hook-shape found under .claude/artifacts/crew/cost/ matching a PR #406 slug; scored from the effort table.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.50
- strategic_alignment: 0.60
- technical_risk: 0.45
- dependency_depth: 0.65

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Moderate-effort finesse layer reusing the proven PR #406 emitter pattern (technical_risk 0.45, top of 0.3-0.5: known pattern, multiple modules, no schema change to existing data); real DORA-consumer demand (astrarunner lead-time/MTTR) but the highest dependency_depth in this batch (three named blockers, one still in-progress) keeps it P2 pending sequencing.

## Risks

- Three-way dependency (FEAT-251, FEAT-252, FEAT-242) with FEAT-242 only 1 of 4 slices closed today (slices_complete: [SLICE-143]) -- this FEAT cannot start yet and may need re-triage once all three land, since scope/risk assumptions could drift in the meantime.
- Hook (a) (/runner:close posts close-comment + closes the mirrored issue) changes close-ceremony behavior for every github-enabled repo, not just Linear ones -- needs an explicit back-compat test so existing github.enabled installs don't get double-commented or an unexpected auto-close.
