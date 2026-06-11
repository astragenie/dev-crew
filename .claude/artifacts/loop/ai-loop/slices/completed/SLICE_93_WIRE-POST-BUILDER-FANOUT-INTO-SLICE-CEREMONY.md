---
id: SLICE-93
title: Wire post-builder-fanout into slice ceremony
status: completed
feature: FEAT-185
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 207
github_url: "https://github.com/sergeymilashico/loop/issues/207"
validations: [.claude/artifacts/crew/validations/20260611T114845Z-validation-result-feat185-slice93-fanout-wiring-validation.md]
reviews: [.claude/artifacts/crew/reviews/20260611T115228Z-review-result-feat185-slice93-wire-post-builder-fanout-into-slice-ceremony.md, .claude/artifacts/crew/reviews/20260611T115300Z-review-result-feat-185-slice-93-fanout-marker-write-is-path-traversal-vuln.md]
completed_at: 2026-06-11
---
# SLICE-93: Wire post-builder-fanout into slice ceremony

Implements FEAT-185. See [feature file](../../../backlog/in-progress/FEAT-185.md) for product context.

## Objective

SLICE-95 (commit 62541ce + fixup af77628) shipped `buildPostBuilderFanout` library + CLI subcommand emitting a 3-task parallel payload (reviewer-A ∥ reviewer-B ∥ validator) after builder PASS. The actual slice ceremony (`/loop:slice complete` flow + `crew:lead` orchestrator) still dispatches reviewers and validator serially. The largest claimed throughput-2x saving (~5 min/slice) is unrealized today, and `commands/slice-complete.md` misrepresents runtime by documenting fanout as the default.

## In scope

- Extend `slice post-builder-fanout` CLI handler in `src/scripts/loop.mts` to write a marker file at `.claude/artifacts/loop/fanout-markers/<slice-id>.json` recording `{ sliceId, taskCount, ts }` on every invocation. Marker write is best-effort (no crash on fs error).
- Extend `src/scripts/lib/grade-telemetry.mts` with `readPostBuilderFanout(repoPath, sliceId)` that reads the marker and returns `true` when present (within 24h of slice-grade time), `null` when absent. Wire into `computeTelemetry` so `timing.post_builder_fanout` populates in grade frontmatter.
- Update the `dispatchInstruction` string emitted by `src/scripts/lib/slice-linker/start-slice.mts` (or wherever it lives) so it directs the orchestrator: after builder PASS, invoke `bun src/scripts/loop.mts slice post-builder-fanout --id <slice>` and dispatch the 3 returned tasks in parallel. This is a PROMPT change — the orchestrator (crew:lead OR parent loop) acts on the instruction.
- Update `commands/slice-complete.md` to reference the new fanout flow accurately (the existing "Aggregation (post-builder fanout)" section is aspirational; this slice makes it real).
- ≥4 new test cases under `src/tests/post-builder-fanout-marker.test.mts` covering marker write, marker read (present + absent), telemetry-field population in grade.

## Out of scope

- Modifying `crew:lead` agent prompt (upstream in hero-crew). The dispatch-instruction change in slice-start is enough — the orchestrator obeys the string.
- Auto-detection of fanout vs serial by counting reviewer artifacts (use the marker, not heuristics).
- Wall-clock measurement of saving (covered by FEAT-184 telemetry + perf-report).
- Wiring `classify-slice-shape` into ceremony (FEAT-186).

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint/format clean (`bun run lint`, `bun run format:check`).
- [ ] AC-2: `bun src/scripts/loop.mts slice post-builder-fanout --id <slice>` writes a marker file at `.claude/artifacts/loop/fanout-markers/<slice>.json` with fields `{ sliceId, taskCount: 3, ts: <ISO> }`.
- [ ] AC-3: `computeTelemetry` (called from `writeGrade`) populates `timing.post_builder_fanout: true` in grade frontmatter when marker exists for the slice; `null` when absent. Idempotent — re-runs preserve the populated value.
- [ ] AC-4: `slice-start`'s `dispatchInstruction` output contains the string `slice post-builder-fanout` directing orchestrator to use fanout post-builder. Verified by a test that calls `slice start` against a fake slice and greps the returned instruction.
- [ ] AC-5: ≥4 new test cases in `src/tests/post-builder-fanout-marker.test.mts`: marker write on CLI invoke, marker read present, marker read absent (returns null), grade-telemetry populates `post_builder_fanout: true` when marker present.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-185 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
