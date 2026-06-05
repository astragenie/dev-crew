---
id: FEAT-040
status: done
priority: P1
category: bugfix
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: [SLICE-41]
derived_from: null
autonomous_safe: true
pm_customer_impact: 0.92
pm_effort_estimate: 0.22
pm_strategic_alignment: 0.88
pm_technical_risk: 0.18
pm_dependency_depth: 0
pm_strategic_fit: 0.88
pm_risk_level: 0.18
composite_score: 0.78
composite_priority: P0
triage_notes: "PM re-scored 2026-06-05 (v2): FEAT body expanded to 17 ACs covering three related gate-bypass bugs sharing one root cause (autonSafe=true branch in walkCandidates bypasses all gates; depends_on done-state check missing in evaluateRiskGate). Live trigger present: FEAT-020 (autoSafe=true, deferred=true, pm_risk_level=0.85) would be dispatched without fix. Same two files, ~+40 src / ~+90 test LOC. AC-17 pins shared pre-branch filter ordering (deferred first, then depends_on). autonomous_safe=true preserved (technical_risk 0.18, effort 0.22, dependency_depth 0.00, hasAC=true). composite_priority P0 (impact>=0.8 AND category=bugfix). Evidence: src/scripts/lib/auto-walker.mts:218-238 (autonSafe branch fork), :109-114 (over-strict depends_on, no done check), :104-106 (deferred check inside autoSafe=false-only path)."
started_at: 2026-06-05
slices_complete: [SLICE-41]
completed_at: 2026-06-05
---
# FEAT-040: auto-walker honors all risk gates for autonomous_safe=true (depends_on + deferred + done-state check)

Three related bugs in src/scripts/lib/auto-walker.mts, all sharing the same root cause: every gate check lives inside the autonomous_safe=false branch, so autonomous_safe=true entries bypass everything.

1. **depends_on ignored for autonomous_safe=true.** walkCandidates line 235-238 calls buildSafePlan without checking depends_on. FEATs with unresolved blockers ship a dispatch plan; builder crashes at first prereq probe. Reported via cortex repo: FEAT-122 (composite 0.58) blocked by FEAT-120 + FEAT-121, walker ignored.

2. **deferred ignored for autonomous_safe=true.** Same branch issue. Observed this run: FEAT-020 (autonomous_safe=true, deferred=true, pm_risk_level=0.85, "explicitly deferred — depth limit and file-claim system unresolved") was planned anyway because the deferred check in evaluateRiskGate only runs for autonomous_safe=false.

3. **depends_on over-strict for autonomous_safe=false.** evaluateRiskGate line 109-114 treats ANY non-empty depends_on as a blocker without checking whether listed FEATs are in done/. Items with all-deps-shipped are silently skipped.

Fix: extract `deferred` and `depends_on` checks into shared filters that run BEFORE the autonSafe branch fork. Verify each dep id against a done-set built once per walker invocation. Skip with reason listing only unsatisfied ids; missing-from-backlog ids get a (missing) suffix. `pm_risk_level` warn stays autoSafe=false-only (creative-gate concern — bounded mechanical autoSafe=true work doesn't need risk warnings).

Acceptance criteria:
- AC-1: depends_on filter applied to BOTH autonomous_safe true and false entries
- AC-2: dep satisfied iff target FEAT id present in backlog with state === done
- AC-3: missing dep id → skip with reason `depends_on: <ids> (missing)`
- AC-4: all deps done → entry processed normally
- AC-5: any dep not done → skip with reason listing only unsatisfied ids
- AC-6: empty/missing depends_on → entry processed normally
- AC-7: test — autoSafe=true with all deps in done/ → planned
- AC-8: test — autoSafe=true with one dep in triaged/ → skipped, reason names unsatisfied dep
- AC-9: test — existing SLICE-B depends_on test corrected for new reason format
- AC-10: test — mixed states (one done, one missing) → skipped, reason lists only unsatisfied
- AC-11: evaluateRiskGate restructured — `deferred` and `depends_on` moved to a shared pre-branch filter; risk gate retains only `pm_risk_level` warn (autoSafe=false-only)
- AC-12: auto-run summary artifact shows correct skip reason
- AC-13: all existing tests pass; lint/typecheck/format/manifests/content-length clean
- AC-14: `deferred: true` → skip with reason `deferred`, REGARDLESS of autonomous_safe value (true, false, or missing)
- AC-15: test — autoSafe=true with deferred=true → skipped with reason "deferred"
- AC-16: test — autoSafe=false with deferred=true still skipped (regression guard for existing behavior)
- AC-17: shared pre-branch filter applies in this order: deferred check first, then depends_on check; first match wins; both surface distinct skip reasons

Out of scope:
- Pattern alerts for repeat-skip (defer to follow-up FEAT if telemetry shows real stalls)
- Topological sort / blocker composite promotion (rejected after tradeoff review — hidden score mutation, doesn't fix autoSafe=false blocker case)
- Cycle detection (no observed cyclic deps)
- Composite-score scale normalization (FEAT-020 uses raw 0-10 scale, FEAT-040 uses 0-1) — separate FEAT
- `pm_risk_level` warn for autoSafe=true (bounded mechanical work doesn't need warnings)

Files touched:
- src/scripts/lib/auto-walker.mts (~+40 / -15 LOC)
- src/tests/auto-walker.test.mts (~+90 / -3 LOC; fix one existing test, add 6 new cases)

Composite target: >= 0.75. Correctness fix to autonomous-loop dispatch with high blast radius — all three gate-bypass bugs share one root cause and one fix.
