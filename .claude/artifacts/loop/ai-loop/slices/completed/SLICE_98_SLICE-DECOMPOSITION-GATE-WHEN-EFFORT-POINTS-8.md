---
id: SLICE-98
title: "Decomposition gate: audit trail on refuse + PM emit proposed_slices rule (FEAT-168 slice-a)"
status: completed
feature: FEAT-168
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-11
updated: 2026-06-11
github_issue: 215
github_url: "https://github.com/sergeymilashico/loop/issues/215"
completed_at: 2026-06-11
---
# SLICE-98: Decomposition gate — audit trail + PM rule (FEAT-168 slice-a)

Implements **AC-3 + AC-6** of FEAT-168. AC-1/2/7 already shipped in v0.41.0 (`a3d9f9c`). AC-4/5 (idempotent rerun, atomic multi-slice creation) defer to follow-up slices because they need a frontmatter parser fix for nested mappings inside YAML arrays (see `feature-lifecycle.mts:282-290` comment).

## Objective

1. Make the decomposition refuse-gate observable: every time `sliceFromFeature` throws `DecompositionRequiredError`, append a structured entry to `.claude/artifacts/loop/auto-dispatch.jsonl` so post-hoc audits can count refuse events.
2. Teach the PM agent to emit `proposed_slices` during triage when `effort_points >= 8`, so refuse-gate trips are rare.

## In scope

- `src/scripts/loop.mts` — `from-feature` CLI handler wraps `sliceFromFeature(...)` in try/catch. On `DecompositionRequiredError` (use `instanceof` from `./lib/proposed-slices.mjs`), call `appendAuditLog(repoPath, { timestamp, parentCommand: "slice from-feature", featureId, error: err.message, ok: false, skipped: false })`. Re-throw so caller sees the error (existing dispatcher already maps throws to `exitCode = 1`). Audit-log flush already runs in the `try/finally` at the dispatcher level.
- New test `src/tests/cli-from-feature-audit.test.mts` — programmatically invoke the `from-feature` handler against a tmp repo with a `effort_points: 8` FEAT lacking `proposed_slices`, assert the throw, then read `.claude/artifacts/loop/auto-dispatch.jsonl` and verify the audit entry shape (all six fields present, `ok: false`, `error` contains FEAT id).
- `agents/pm.md` — extend "Framework 5: Effort Calibration" or add a new sub-rule mandating: when scoring a FEAT, after mapping `pm_effort_estimate` to a Fibonacci `effort_points`, if `effort_points >= 8` the PM MUST emit a `proposed_slices:` block with >= 2 entries whose `sum(points) >= effort_points`. If PM cannot decompose, set `composite_priority: "needs-review"` and explain in `scopeNotes`.

## Out of scope

- AC-4 idempotent rerun consuming `proposed_slices[]` - needs parser fix first.
- AC-5 atomic multi-slice creation from `proposed_slices[]` - needs parser fix first.
- Parser fix itself (frontmatter writer round-tripping nested mappings inside YAML arrays) - separate slice.

## Acceptance criteria

- [ ] AC-1: All tests pass (`bun test src/tests/ --parallel --timeout 60000`) and lint is clean (`bun run lint`).
- [ ] AC-2 (FEAT AC-3 - audit trail on refuse): Invoking `from-feature` against a FEAT with `effort_points: 8` and no `proposed_slices` (a) re-throws `DecompositionRequiredError` so the dispatcher sets exit code 1, AND (b) appends exactly one JSON line to `.claude/artifacts/loop/auto-dispatch.jsonl` with shape `{timestamp: <ISO-8601>, parentCommand: "slice from-feature", featureId: "FEAT-NNN", error: "<message>", ok: false, skipped: false}`. Test `src/tests/cli-from-feature-audit.test.mts::refuse-emits-audit-entry` proves both.
- [ ] AC-3 (FEAT AC-6 - PM rule): `agents/pm.md` contains an explicit rule: when `effort_points >= 8`, emit `proposed_slices` with >= 2 entries summing to >= `effort_points`, or escalate via `composite_priority: "needs-review"`. Rule cites FEAT-168 by id so future readers can trace it. Grep test `src/tests/pm-decomposition-rule.test.mts::rule-present-in-pm-md` asserts the rule text exists.

## Done When

- All AC PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`.
- `bun test src/tests/ --parallel --timeout 60000` green.
- `bun run lint` clean (no NEW errors; pre-existing 36 warnings allowed).
- `bun ./src/scripts/validate-content-length.mts` green (pm.md must stay <= 300 lines).
- Final-synthesis artifact written.
- Feature FEAT-168 stays in `in-progress/` (slices b + c remain open).

## Reviewer ladder

- Reviewer A (correctness): verify audit entry timestamp is ISO-8601 not local time; verify the error re-throw path doesn't double-log if a later refactor catches at multiple layers; verify the PM rule grep test pins the rule text by intent, not exact wording.
- Reviewer B (production-readiness): verify `appendAuditLog` is called even when the refuse happens before any backlog mutation (it must - the file move happens AFTER `assertSized`); verify the test doesn't shell out (uses the imported handler directly); verify pm.md edit doesn't exceed content-length cap.
