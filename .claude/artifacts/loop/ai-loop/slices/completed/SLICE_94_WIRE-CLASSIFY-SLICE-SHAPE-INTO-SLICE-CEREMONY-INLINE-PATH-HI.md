---
id: SLICE-94
title: Wire classify-slice-shape into slice ceremony (inline-path hint)
status: completed
feature: FEAT-186
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 209
github_url: "https://github.com/sergeymilashico/loop/issues/209"
validations: [.claude/artifacts/crew/validations/20260611T121348Z-validation-result-feat186-slice94-shape-wiring-validation.md]
reviews: [.claude/artifacts/crew/reviews/20260611T121716Z-review-result-feat-186-slice-94-shape-marker-wiring-inline-path-hint.md, .claude/artifacts/crew/reviews/20260611T121803Z-review-result-feat186-slice94-shape-marker-inline-path-wiring-into-slice-c.md]
completed_at: 2026-06-11
---
# SLICE-94: Wire classify-slice-shape into slice ceremony (inline-path hint)

Implements FEAT-186. See [feature file](../../../backlog/in-progress/FEAT-186.md) for product context.

## Objective

SLICE-94 (commit 6eb7154) shipped `classifySliceShape({ files })` library + `classify-slice-shape` CLI returning one of `doc-update | config-tweak | single-module-edit | test-only | none`. Nothing in the ceremony auto-invokes it. Orchestrators don't see the inline-path hint, so `dispatchLimits.preferInlineFor` (extended in the same slice) has no consumer for the 4 new shapes. `perf-report.inlinePathPct` stays at 0% indefinitely.

## In scope

- Add `classify-slice-shape` invocation to `src/scripts/lib/slice-linker/start-slice.mts` (or wherever slice-start emits `dispatchInstruction`). When the slice file has a `## Files` section, parse the file list, call `classifySliceShape({ files })`, and embed the result hint into `dispatchInstruction`.
- New marker file at `.claude/artifacts/loop/shape-markers/<slice-id>.json` recording `{ sliceId, shape, rationale, inlinePath, ts }` where `inlinePath = shape ∈ dispatchLimits.preferInlineFor`.
- Best-effort marker write (no crash). Same `SLICE_ID_RE` traversal guard as `fanout-marker.mts` (extract to shared helper `src/scripts/lib/slice-id-guard.mts` if cleaner).
- Extend `src/scripts/lib/grade-telemetry.mts` with `readShapeMarker(repoPath, sliceId)` reading the marker; wire into `computeTelemetry` so `shape.classified` + `shape.inline_path_used` populate in grade.
- `dispatchInstruction` includes shape hint line: "Inline-path recommended (shape: <name>, rationale: <text>)" when classifier suggests inline AND `dispatchLimits.expandedInlineCriteria !== false`.
- Add `dispatchLimits.expandedInlineCriteria: true` to `.claude/loop.json` (default ON, flag-gated kill-switch).
- ≥4 new test cases in `src/tests/shape-marker.test.mts`.

## Out of scope

- Modifying `crew:lead` agent prompt or orchestrator behavior beyond the dispatch-instruction text change.
- Auto-rerouting the dispatch (the orchestrator can ignore the hint; advisory only per spec).
- Pruning policy for `shape-markers/` (future FEAT).
- Wall-clock measurement of inline-path savings (covered by FEAT-184 telemetry).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint/format clean (`bun run lint`, `bun run format:check`).
- [ ] AC-2: `slice start` against a slice file whose `## Files` section lists only `.md` files writes a shape marker at `.claude/artifacts/loop/shape-markers/<slice>.json` with `shape: "doc-update"` and `inlinePath: true`.
- [ ] AC-3: `computeTelemetry` populates `shape.classified` (the shape tag string) and `shape.inline_path_used` (boolean from marker `inlinePath`) in grade frontmatter when shape marker exists. Idempotent.
- [ ] AC-4: `slice-start` `dispatchInstruction` contains substring `inline-path recommended` when classifier returns a shape in `dispatchLimits.preferInlineFor`. Does NOT contain that line when shape is `none`. Verified by 2 tests.
- [ ] AC-5: ≥4 new test cases in `src/tests/shape-marker.test.mts`: marker write on shape ≠ none, no marker on shape = none OR marker with `inlinePath: false`, telemetry read populates fields, dispatch-instruction grep positive + negative.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-186 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
