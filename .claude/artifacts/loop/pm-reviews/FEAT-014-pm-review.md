---
id: PM-REVIEW-FEAT-014
feature: FEAT-014
reviewed_at: 2026-08-19
pm_customer_impact: 0.4
pm_effort_estimate: 0.75
pm_strategic_alignment: 0.55
pm_technical_risk: 0.65
pm_dependency_depth: 0.35
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-014

## Demand Assessment

- **Evidence:** Phase 2 of the same actively-graded crew/ flatten program as FEAT-013; FEAT body names concrete, already-identified blockers (crew pinned to TS6 because openapi-typescript needs the JS compiler API that native tsc 7 lacks; NodeNext-vs-Bundler moduleResolution divergence; ~10 crew-only deps to merge) rather than speculative scope.

## Scope Challenge

- **Scope notes:** Genuinely large, cross-cutting change: single root package.json/bun.lock and one tsconfig strategy across 287 crew files, with CI's crew-tests job collapsing into the root suite invocation once done. Per runner#393 policy (a), the TS6-vs-TS7 compiler-API conflict is a flagged landmine/design-decision (no resolution stated in the FEAT text -- 'keep typescript 6 as a devDependency for that tool or replace the tool' is an open question) and is isolated into its own slice below rather than absorbed into the mechanical dependency-merge work.

## Scores

- customer_impact: 0.40
- effort_estimate: 0.75
- strategic_alignment: 0.55
- technical_risk: 0.65
- dependency_depth: 0.35

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: Effort_estimate of 0.75 maps to 8 Fibonacci points (pm-effort-mapper.mts band 0.6-0.85), triggering the decomposition gate; technical_risk of 0.65 (cross-module reach across 287 files plus an unresolved tooling landmine) forces autonomousSafe:false on its own via the >0.6 threshold, independent of the decomposition requirement -- this needs architect/operator involvement before any slice in this FEAT is dispatched autonomously.

## Risks

- It is two weeks later and this slice failed review or validation -- most likely cause: the TS6-vs-TS7 compiler-API landmine was decided informally mid-slice instead of via its own isolated design slice, and the chosen resolution (keep TS6 devDependency vs replace openapi-typescript) turns out to be wrong once the full 287-file tree is compiled against it.
- This merged and broke the loop -- rollback requires more than git revert: once package.json/bun.lock are unified and the crew-tests CI job is collapsed into the root suite, reverting requires restoring both the lockfile state AND the separate CI job definition, not just the source diff.
- Which existing test would NOT catch a regression here: existing per-tree (crew vs root) test runs would not catch a moduleResolution divergence regression that only manifests once both trees compile under a single unified tsconfig -- the AC set must include a full-repo build/typecheck pass, not just each tree's existing suite in isolation.
