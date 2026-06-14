---
id: SLICE-124
title: Error-pattern registry with automatic recovery for specialist dispatch failures
status: completed
feature: FEAT-174
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 263
github_url: "https://github.com/sergeymilashico/loop/issues/263"
completed_at: 2026-06-13
---
# SLICE-124: Error-pattern registry with automatic recovery for specialist dispatch failures

Implements FEAT-174. See [feature file](../../../backlog/in-progress/FEAT-174.md) for product context.

## Objective

Competitor gap (Maestro v0.15.3). Maestro maintains a per-agent error-pattern registry that detects known failure signatures in agent output and triggers automatic recovery plus user-friendly messages. Loop handles the recurring specialist-pause failure mode (builder/reviewer/validator pauses without writing artifact) only via a manual SOP doc (docs/sop/specialist-pause-handling.md). Proposal: codify the SOP into machine-checkable patterns (pause-without-artifact, empty artifact, truncated output, budget-exceeded mid-task) with a registry consulted at dispatch-result time; on match, apply the documented recovery action automatically and log to learnings.jsonl. Adjacent to FEAT-130 (stuck-detector) which covers runaway loops, not output-pattern recovery. Scoring: impact 2 / effort 2 / fit 3 (composite 6).

## In scope

- New `src/scripts/lib/error-pattern-registry.mts`: `ErrorPattern` interface + 4 built-in patterns (pause-without-artifact, empty-artifact, truncated-output, budget-exceeded); `matchPatterns(output: string): ErrorPattern | null`
- `checkDispatchResult(builderOutput: string, artifactPath: string): RecoveryAction | null` consulted after builder completes; returns recovery hint (retry-with-inline, re-dispatch, escalate)
- On match: append one JSON line to `.claude/artifacts/loop/learnings.jsonl` with pattern id + sliceId + timestamp
- `src/tests/error-pattern-registry.test.mts` ≥6 tests

## Out of scope

- Auto-retry execution (return recovery hint only; operator executes retry)
- UI or dashboard for pattern frequency
- Changes to builder/reviewer dispatch flow (this is a post-result check only)

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test`) and linter is clean (`bun run lint`)
- [ ] AC-2: `matchPatterns(output)` returns the correct `ErrorPattern` for each of the 4 known failure signatures when given synthetic matching strings, and returns `null` for non-matching output. `checkDispatchResult` returns the correct `RecoveryAction` or `null` depending on artifact presence. Verified by ≥6 tests.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-174 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
