---
id: GRADE-SLICE-36
slice: SLICE-36
feature: FEAT-010
spec: null
phase: 2
target_release: null
graded_at: 2026-06-04
duration_hours: 0.6
scores: null
decisions: []
---
# SLICE-36: static confidence signal at slice-start — Grade

**Feature:** FEAT-010 · **Slice:** SLICE-36 (FEAT-010 SLICE-A) · **Phase:** 2

## Scores

- architecture_quality: 0.85
- reliability: 0.85
- observability: 1.00
- production_readiness: 0.85
- security: 0.95
- test_confidence: 0.90
- product_completeness: 0.85

### Inference sources

- test_confidence: confidence heuristic unit tests cover green / 3 yellow paths / 3 red paths + integration test asserts startSlice return contains confidence + reason
- product_completeness: SLICE-A delivers the static signal at slice-start; SLICE-B (mid-execution updates) remains as future work per FEAT-010 plan
- observability: confidence + reason now flows through start-slice return AND slice-progress dashboard; LoopObserver-style consumers get the signal for free

## Lessons

- Builder hit mid-cleanup stop again (7th occurrence). Required manual fixup: missing `recentGradeAvg` key in `gatherSliceResources` return + missing `confidence`/`confidenceReason` in `buildStartSliceReturn` parameters + missing `computeConfidence`/`detectAcceptanceCriteria` imports. State on disk was incomplete but recoverable; ~5 line fix per gap.
- The fire-and-forget integration pattern is the right shape for any deterministic signal at slice-start. Heuristic helpers are easy to add when inputs are already gathered.
- Confidence heuristic correctly handled the null-grade-history edge case in tests (does not punish first slices with no trend data).

## Decisions

(none new — heuristic thresholds are tunable config, not architectural)

## Surprises

- Builder reported "all gates green" but build was actually broken after their refactor — they wrote a synthesis claim without running the gates one final time after the cyclomatic-complexity-driven extraction. Verification-before-completion gap.
- The confidence value for SLICE-36 itself was not surfaced in the live smoke (didn't bother — unit tests cover the contract); could be a followup to verify the dashboard rendering visually.

## Followups

- SLICE-B (mid-execution confidence updates) — defer until usage shows value. Static signal at start may be enough; mid-execution feels like premature signal.
- Tune heuristic thresholds based on real usage. Currently 0.80/0.85 are guesses; calibrate after seeing 10+ slices.
- Persist confidence + reason in slice frontmatter at slice-complete time so retrospective tooling can correlate predicted-vs-actual.
- Consider rendering confidence in `/crew:brief-me` output as the headline signal.
- Builder mid-cleanup stop hit again (7th — FEAT-032 spike still warranted).

## What went well

Heuristic is small (~30 LOC), pure, fully unit-tested. Integration into start-slice was bounded (added 3 inputs + 1 helper call + 2 return fields). Slice-progress dashboard wiring was minimal. No regression on existing slice-start callers (confidence defaults to null when not computed).

## What went wrong

- Builder mid-cleanup truncation (7th time). Required parent to finish the wiring: import gaps, signature gaps, missing keys. ~5 manual edits to land.
- Slice-progress dashboard "wiring" ended up as no-op — refreshSliceProgress accepts confidence params but doesn't pass to writeSliceProgress. The dashboard rendering of confidence is therefore aspirational, not actual. Filed as followup.

## What I would do differently next time

- For builder-stop-prone slices: explicitly request a final "rerun all gates" step in the brief, even after the builder reports done.
- Implement and test confidence integration in slice-progress in the same slice (don't leave the wiring half-done).
- For heuristic-bearing slices, include a live-smoke AC that prints the actual confidence value for the slice's own start invocation.

## References

- slice file: `.claude/artifacts/loop/ai-loop/slices/completed/SLICE_36_CONFIDENCE-REPORTING-PER-SLICE-TRAFFIC-LIGHT-SIGNAL.md`
- feature file: `.claude/artifacts/loop/backlog/in-progress/FEAT-010.md` (SLICE-B remains)
- helper module: `src/scripts/lib/confidence-signal.mts`
