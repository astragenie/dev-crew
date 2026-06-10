---
id: SLICE-33
status: completed
feature: FEAT-036
phase: null
priority: P3
target_release: null
requires_validation: true
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 77
github_url: "https://github.com/sergeymilashico/loop/issues/77"
---
# SLICE-33: FEAT-036 — parser hardening (issues #8 + #9)

Implements FEAT-036 partial — parser robustness half. See [feature file](../../../backlog/in-progress/FEAT-036.md) for full FEAT-036 scope. Test-coverage additions (#5/#6/#7) deferred to SLICE-34.

## Objective

Two foundation fixes from SPEC-002 Theme C:

- **Issue #9 — `subagent_stop` payload null `agent_type` normalization**. Stop payloads loading with null `agent_type` produce "unknown" rows in agent reports. Fall back to the start payload's `agent_type` when stop is null. Side-effect spotted during FEAT-031 SLICE-28 real-data probe.
- **Issue #8 — architect output parser fragility**. `spec-decompose` parser treats output as semicolon-separated titles. A structured-prose architect response collapses to one stub FEAT (observed during SPEC-002 decomposition — meta-recursive bug, captured in commit `c76603b`). Need tolerant parser: handle newline-separated + numbered-list + prose-with-list formats.

## In scope

- `src/scripts/lib/slice-linker/agent-report-writer.mts::pairAgentEvents`: when both start AND stop exist for an `agent_id`, and stop's `agent_type` is null/empty, fall back to start's `agent_type` before constructing the pair.
- `src/scripts/lib/spec-decompose.mts` (or wherever architect output is parsed — locate via grep): tolerate three input shapes:
  1. Current behavior — semicolon-separated titles on one line
  2. Newline-separated titles, one per line
  3. Markdown numbered list (`1. Title\n2. Title`)
  Out-of-format prose remains the no-extraction path (one stub FEAT created, warn logged).
- Unit tests for each parser shape under `src/tests/`.

## Out of scope

- Issue #5 (skipped regression test in `slice-complete-docwriter.test.mts`) — deferred to SLICE-34.
- Issue #6 (`gh_unavailable` path test) — deferred to SLICE-34.
- Issue #7 (`fetchPrStatus` JSON schema validation) — deferred to SLICE-34.
- Anything outside parser logic.

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter clean (`npm run lint`).
- [ ] AC-2: New unit test in `agent-report-writer.test.mts` asserts that when start payload has `agent_type: "crew:builder"` and stop payload has `agent_type: null`, the resulting agent row reports `crew:builder`, not `unknown`.
- [ ] AC-3: New unit tests in `spec-decompose` parser file (or co-located) cover three shapes — semicolon, newline, numbered list — and one negative case (prose without titles → no extraction, warn). Each shape produces the expected FEAT title array.
- [ ] AC-4: Re-running `spec-decompose` against SPEC-002 (now in `decomposed` state) on a synthetic architect output containing three newline-separated titles produces 3 FEATs, not 1 stub.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-036 stays in `in-progress/` (SLICE-34 will close it)
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: parser correctness — do the three shapes each parse correctly? Does the negative case still log a warning?
- Reviewer B: regression on existing semicolon-separated callers — does any prior architect output regress under the new parser?
