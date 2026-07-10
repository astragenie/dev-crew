---
id: PM-REVIEW-FEAT-242
feature: FEAT-242
reviewed_at: 2026-07-09
pm_customer_impact: 0.65
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.85
pm_technical_risk: 0.6
pm_dependency_depth: 0
composite_priority: P1
autonomous_safe: true
---
# PM Review — FEAT-242

## Demand Assessment

- **Evidence:** Plan quote (.claude/artifacts/crew/runs/2026-07-07-watcher-implementation-plan.md:18-21): 'Up to 20 repos watched from 1-2 dev machines. Every ~5 min: detect new issues, broken builds, red PRs, deployment failures. React automatically... No open terminals required.' Stakeholder is the fleet operator (this repo's owner, who commissioned and had the plan APPROVED-WITH-CONDITIONS by opus architect-reviewer 2026-07-07). Corroborating internal telemetry: .claude/artifacts/loop/loop-snapshot.md reports 'Pause rate (last 15 dispatches): 66.7%' — the exact weak link the plan's own risk-ranking (risk #2) names for this track. ACs artifact (2026-07-07-watcher-acs-eta.md:64-67) independently concludes 'autonomous_safe: true — new module + CLI command following existing patterns... ACs above are independently testable in this repo,' which I concur with.

## Scope Challenge

- **Scope notes:** Smallest deliverable: tick core (AC-1/AC-2) + minimal registry read is the load-bearing kernel; if scope must be halved, defer the configurable concurrency/cost ceiling (AC-4) to a hardcoded conservative default (cap=1) and treat the scheduler-registration smoke test (AC-7) as a documented manual step rather than automated — but do NOT cut claim-before-spawn ordering (AC-3) or the tick lockfile (AC-2), both are cross-machine/cross-tick safety primitives the rest of the watcher plan depends on. No overlap found: grepped repo for existing watch-tick/registry modules and a `/runner:watch` command — none exist (`find . -iname watch-tick*` and `find . -path */commands/watch*` both empty); pr-watch.mts and gh-rate-limiter.mts exist and are explicitly reused as *logic* (cost-ceiling, circuit-breaker patterns), not state storage, per the plan — confirmed no duplicate-capability build. AC clarity: strong — all 8 ACs in the ACs artifact are Given-When-Then with named evidence (unit test assertions, grep checks, or explicit manual-verification fallback for AC-7); none are vague. Weak-dimension check (Framework 4): none of the last-5 grade averages in loop-snapshot.md are below 0.80 (architecture_quality 0.846, reliability 0.86, observability 0.82, production_readiness 0.872, security 0.88, test_confidence 0.914, product_completeness 0.844) — no mandatory weak-dimension AC required. Effort calibration (Framework 5): no clean cost analog — the two most recent aggregate cost reports (feat238-slice141, feat239-slice142) are cross-repo/cross-project aggregates ($19.6k+) that don't isolate a single comparable slice's actual cost; the smallest isolated analog available, FEAT-215/SLICE-140 ($220.75, 97.5min, 5 sessions), is a dashboard/UI slice with a different blast-radius shape than a new multi-module state-bearing subsystem — noting 'no cost analog' per Framework 5 fallback. Decomposition gate (FEAT-168): effort_estimate 0.65 maps to 8 effort_points via pm-effort-mapper.mts bands (0.6 <= x < 0.85 -> 8) — decomposition required. Frontmatter currently shows `depends_on: []` on FEAT-242/244/245/246 despite body text describing a real dependency chain (FEAT-244/245/246 all state 'Depends on FEAT-242' in prose) — this is a backlog-discipline gap worth a follow-up rescope pass so the dependency graph is machine-readable, not just narrative.

## Scores

- customer_impact: 0.65
- effort_estimate: 0.65
- strategic_alignment: 0.85
- technical_risk: 0.60
- dependency_depth: 0.00

## Priority Derivation

composite_priority: P1
autonomous_safe: true
reasoning: P1: foundational, blocks C1/C3/B1.5, architect-approved, high strategic alignment to the core autonomous-loop mission; technical_risk banded at 0.6 (low end of 0.6-0.8 cross-module-reach band: multiple new modules — tick, registry, state, concurrency, scheduler script, CLI command — but no new external dependency and clean git-revert rollback for the code itself) triggers mandatory pre-mortem; effort_estimate 0.65 maps to 8 Fibonacci points, tripping the FEAT-168 decomposition gate.

## Risks

- Pre-mortem Q1 (two weeks later, review/validation failure): most likely cause is the COND-2 state-write ownership split (tick owns lastSeenIssue/timestamps, reaction owns attemptCounts/costSpent) shipping with a concurrency test that mocks/serializes the interleaving instead of forcing a genuine concurrent read-modify-write on the same state file — AC-5 explicitly calls for interleaved writes, but a shallow implementation could pass a sequential-looking test while the real atomic temp+rename logic still drops a field under true concurrency.
- Pre-mortem Q2 (merged and broke the loop, rollback cost): code-level rollback is `git revert` only (new module, no schema change to any existing subsystem, no published cross-plugin artifact) — BUT if the Task Scheduler registration script (AC-7) already ran on the operator's machine before the revert, an operator step (unregister the scheduled task) is required in addition to the code revert, or a reverted watch-tick.mts keeps getting invoked on a stale binary until the task is manually cleared.
- Pre-mortem Q3 (coverage gap): no existing test in this repo exercises concurrent file writes to the same JSON state file across two logically-separate processes (tick vs. reaction) — pr-watch.mts's breaker state is explicitly documented as process-local (plan line 83-84: 'pr-watch's breaker state is process-local and does not survive restarts'), so no existing suite would catch a regression in the new atomic temp+rename + lost-update-prevention logic; this is new coverage territory the slice's own AC-5 must originate, not inherit.
- Cascade risk (Framework 3, dispatch/state-recovery paths): this FEAT owns claim-label + TTL state-recovery (COND-1) and concurrency/cost-ceiling dispatch gating (COND-4) — a bug in claim-TTL expiry could cause duplicate Layer-2 `claude -p` spawns fleet-wide (cost cascade), and a bug in the concurrency cap could let a correlated multi-repo failure spawn unbounded parallel headless sessions, which is exactly the failure mode COND-4 was written to prevent.
