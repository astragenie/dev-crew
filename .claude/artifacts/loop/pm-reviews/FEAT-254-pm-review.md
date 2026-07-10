---
id: PM-REVIEW-FEAT-254
feature: FEAT-254
reviewed_at: 2026-07-10
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.6
pm_technical_risk: 0.45
pm_dependency_depth: 0.55
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-254

## Demand Assessment

- **Evidence:** Source plan Phase 5c: 'Gives astrarunner issue open->close timestamps for lead-time/MTTR.' This is a real named downstream consumer (astrarunner's DORA materialized view, already ingesting pr.merged/spec.created via PR #406) waiting on the same envelope pattern for issue lifecycle events -- not speculative demand.

## Scope Challenge

- **Scope notes:** Three independently-scoped hooks, smallest deliverable per hook: (a) provider close-comment + close-issue call only, reuse closeSlice.mts's existing grade/PR data rather than building new formatting; (b) URL-pattern routing reusing the existing from-issue.mjs::fetchIssue GitHub-only contract (loop.mts:775-782) as the template, add a Linear-URL branch; (c) emitter module skeleton copying pr-merged-emitter.mts's exact shape (buildPrMergedInput / fanoutEnvelope / schemas/loop-events/ + index.json entry). Dependency_depth revised from the initial triage's 0.65 down to 0.55: of the three depends_on entries (FEAT-251, FEAT-252, FEAT-242), FEAT-242 -- the SEQUENCING gate the source plan explicitly named ('queue Phase 5 until FEAT-242 (B1) slices close — shared envelope/fanout surface') -- is now status:done (.claude/artifacts/loop/backlog/done/FEAT-242.md, updated 2026-07-10, slices SLICE-143..146). FEAT-251 and FEAT-252 remain in triaged/, not done, so the FEAT is still genuinely blocked, just by fewer open items than originally scored. No cost analog: nearest neighbor is FEAT-242/SLICE-143 ($9.85, ~51 min) but that was tick/registry/scheduler work, not emitter/hook work; effort_estimate 0.5 scored from the dimension table.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.50
- strategic_alignment: 0.60
- technical_risk: 0.45
- dependency_depth: 0.55

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Three independently-testable finesse hooks reusing the proven PR #406 emitter pattern. dependency_depth revised 0.65->0.55 since the watcher-track blocker (FEAT-242 B1) is now done, though a same-id unrelated FEAT-242 was separately filed and must not be confused with it (flagged in risks). technical_risk 0.45 confirmed (known pattern, multiple modules, no schema change to existing data). P2 confirmed.

## Risks

- FEAT-242 id collision: this FEAT's depends_on cites FEAT-242, and the watcher-track FEAT-242 (B1 tick/registry/scheduler, SLICE-143-146) that the source plan's SEQUENCING gate refers to has closed done. However a second, unrelated FEAT-242 ('subagent report-protocol enforcement + orchestrator watchdog', filed 2026-07-09, status: pending) now also exists in .claude/artifacts/loop/backlog/pending/FEAT-242.md, reusing the same id. A builder or dispatcher grepping bare 'FEAT-242' during Phase 5 work could pull the wrong file -- disambiguate by reading depends_on context and the done/ directory location, not by id alone, before dispatch (same failure shape as the FEAT-188 cross-repo id collision precedent already on file for this program).
- Two of three named blockers (FEAT-251, FEAT-252) are still triaged, not done -- Phase 5 code cannot start until both land. Hook (a) specifically needs FEAT-251's getProvider migration reachable from the close ceremony; hook (c)'s emitter has no blocker beyond the PR #406 pattern already on main and could in principle be built first if the team wants to de-risk incrementally.
- It is two weeks later and this slice failed review -- most likely cause: the three hooks (a/b/c) get built and reviewed as one undifferentiated diff instead of three independently testable units, so a reviewer cannot isolate which hook regressed. AC-1 through AC-6 are split per-hook (two ACs each) specifically to prevent this.
- This merged and broke the loop -- rollback: hook (a) touches the close ceremony and posts comments to live external issues; a plain `git revert` does not unpost comments already sent to GitHub/Linear, so rollback for hook (a) requires either a manual follow-up comment or accepting the artifact, not a clean revert -- flag this in the slice's own rollback notes.
