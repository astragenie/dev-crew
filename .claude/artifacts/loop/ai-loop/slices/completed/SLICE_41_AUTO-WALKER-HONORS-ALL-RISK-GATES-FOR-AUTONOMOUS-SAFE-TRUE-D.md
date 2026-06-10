---
id: SLICE-41
status: completed
feature: FEAT-040
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
github_issue: 85
github_url: "https://github.com/sergeymilashico/loop/issues/85"
---
# SLICE-41: auto-walker honors all risk gates for autonomous_safe=true (depends_on + deferred + done-state check)

Implements FEAT-040. See [feature file](../../../backlog/in-progress/FEAT-040.md) for product context.

## Objective

Three related bugs in src/scripts/lib/auto-walker.mts, all sharing the same root cause: every gate check lives inside the autonomous_safe=false branch, so autonomous_safe=true entries bypass everything.

## In scope

- Extract `deferred` and `depends_on` checks into shared pre-branch filter in `walkCandidates`
- Build done-set from backlog once per walker invocation for dep resolution
- Fix over-strict `evaluateRiskGate` depends_on check (done-state check missing)
- Add 6 new test cases; fix 1 existing test for new reason format

## Out of scope

- Topological sort or composite-score promotion for blockers
- Cycle detection
- Composite-score scale normalization (separate FEAT)
- `pm_risk_level` warn for autoSafe=true

## Acceptance criteria

- [ ] AC-1: depends_on filter applied to BOTH autonomous_safe true and false entries
- [ ] AC-2: dep satisfied iff target FEAT id present in backlog with state === done
- [ ] AC-3: missing dep id → skip with reason `depends_on: <ids> (missing)`
- [ ] AC-4: all deps done → entry processed normally
- [ ] AC-5: any dep not done → skip with reason listing only unsatisfied ids
- [ ] AC-6: empty/missing depends_on → entry processed normally
- [ ] AC-7: test — autoSafe=true with all deps in done/ → planned
- [ ] AC-8: test — autoSafe=true with one dep in triaged/ → skipped, reason names unsatisfied dep
- [ ] AC-9: test — existing SLICE-B depends_on test corrected for new reason format
- [ ] AC-10: test — mixed states (one done, one missing) → skipped, reason lists only unsatisfied
- [ ] AC-11: evaluateRiskGate restructured — deferred and depends_on moved to shared pre-branch filter; risk gate retains only pm_risk_level warn (autoSafe=false-only)
- [ ] AC-12: auto-run summary artifact shows correct skip reason
- [ ] AC-13: all existing tests pass; lint/typecheck/format/manifests/content-length clean
- [ ] AC-14: deferred=true → skip with reason "deferred", REGARDLESS of autonomous_safe value
- [ ] AC-15: test — autoSafe=true with deferred=true → skipped with reason "deferred"
- [ ] AC-16: test — autoSafe=false with deferred=true still skipped (regression guard)
- [ ] AC-17: shared pre-branch filter order: deferred first, then depends_on; first match wins

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-040 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
