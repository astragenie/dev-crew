---
id: FEAT-071
status: done
priority: P2
category: performance
target_release: v0.26.0
created: 2026-06-07
updated: 2026-06-07
depends_on: [FEAT-070]
dependencies: [FEAT-069, FEAT-070]
slices: [SLICE-75, SLICE-76]
derived_from: SPEC-004
composite_score: 0.72
composite_priority: P2
autonomous_safe: false
pm_customer_impact: 0.7
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.75
pm_technical_risk: 0.55
pm_dependency_depth: 0.7
pm_demand_signal: 0.7
pm_implementation_confidence: 0.6
pm_reasoning: "Phase C perf wins — bench harness + top-10 memo/snapshot/lazy/batched-git/parallel-fs/regex-hoist/decisions-memo/structuredClone/Map/telemetry-batch. ≥20% wall-clock cut on top 3 commands. Higher impact than FEAT-069 but sequenced LAST so it lands on a type-tight codebase. autonomous_safe=false: memoization correctness (cache key=(path, mtime), invalidate on snapshot boundary) and CI flake risk require reviewer + validator gates."
triage_notes: "Scored from SPEC-004 (decomposed). 3 slices: C1 bench harness (10% regression gate), C2 wins 1-5, C3 wins 6-10. Risk register flags memoization stale-read risk on long-running auto-mode + bench harness flakiness on CI. autonomous_safe=false because perf changes need validator-measured before/after, and memo invalidation is correctness-critical. Walker must respect dependencies=[FEAT-069, FEAT-070] — Phase A dead code removal narrows hot path; Phase B noUncheckedIndexedAccess affects array-access shape that perf wins depend on. composite_score (0.72) between FEAT-069 (0.69) and FEAT-070 (0.74); strict SPEC-004 phase order overrides composite-only sort."
phase: 3
tags: [test, refactor, infra]
needs_contract: false
needs_ux: false
started_at: 2026-06-07
slices_complete: [SLICE-75, SLICE-76]
completed_at: 2026-06-07
github_issue: 150
github_milestone: 3
github_url: "https://github.com/sergeymilashico/loop/issues/150"
---
# FEAT-071: Top-10 perf wins — bench harness + memo + snapshot + lazy + batched-git + parallel-fs

## Description

Land a `node:test` bench harness and ship the top-10 perf wins on
hot CLI commands (`/loop:brief`, `/loop:triage`, `/loop:auto`), per
SPEC-004 Phase C. Target: ≥20% wall-clock cut on the top 3 commands,
no other command regresses >5%.

3 slices:

- **C1** — `node:test` bench harness with a 10% regression gate
  (median of N runs, assert against rolling baseline not absolute)
- **C2** — wins 1–5:
  1. memoize frontmatter parse (key by path + mtime)
  2. single backlog snapshot per invocation
  3. lazy subcommand load
  4. batched git reads
  5. parallel fs walk
- **C3** — wins 6–10:
  6. hoisted regex
  7. per-process decisions / grade memo
  8. `structuredClone` over JSON round-trip
  9. Map over object lookups for hot keys
  10. telemetry batch flush

## Acceptance hints

- Bench harness merged before any perf win lands (C1 first)
- ≥20% wall-clock cut on `/loop:brief`, `/loop:triage`, `/loop:auto` (median of N runs)
- No command regresses >5%
- Memoization keys by `(path, mtime)`; invalidates on snapshot boundary (no stale reads in auto-mode)
- Each slice reviewer + validator gated; no autonomous-safe walker pickup

## Sequencing

Depends on FEAT-069 + FEAT-070 — Phase C operates on the type-tight,
dead-code-free codebase Phases A and B produce. Landing perf wins
before Phase B's `noUncheckedIndexedAccess` would force a rewrite of
every memoization touch point.

## References

- SPEC-004 — Code-Quality Pivot
