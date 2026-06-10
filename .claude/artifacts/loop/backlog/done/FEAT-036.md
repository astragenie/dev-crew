---
id: FEAT-036
status: done
priority: P3
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-33]
derived_from: SPEC-002
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=SPEC-002 → true"
started_at: 2026-06-04
slices_complete: [SLICE-33]
completed_at: 2026-06-04
github_issue: 76
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/76"
---
## Description

Five small additions covering parser robustness + test coverage. SPEC-002 Theme C, issues #5, #6, #7, #8, #9.

### Issue #9 — Subagent_stop payload null agent_type
Stop payloads loading with null `agent_type` produce 'unknown' rows in agent reports (SLICE-28 grade Followups). Normalize: fall back to start payload's `agent_type` when stop is null.

### Issue #8 — Architect output parser fragility
Parser in spec-decompose treats output as semicolon-separated titles. A structured-prose architect response collapses to one stub FEAT (observed during SPEC-002 decomposition — meta-recursive bug). Need tolerant parser: handle newline-separated + numbered-list + prose-with-list formats.

### Issue #7 — gh JSON schema validation gap
`fetchPrStatus` in FEAT-009 SLICE-22 PR autofix parses `gh` JSON with no shape validation. Add runtime check that throws clearly on schema mismatch.

### Issue #6 — gh_unavailable path untested
FEAT-009 SLICE-22 has no test for `ghExec` throws path. Add defensive unit test.

### Issue #5 — Skipped regression test
`test.skip` in `src/tests/slice-complete-docwriter.test.mts` since SLICE-27. Fixture didn't satisfy `findFeatureById` + `feature_complete`. Refactor fixture using real `slice-from-feature` flow or drop the test as duplicative with `slice-complete-multi-slice.test.mts`.

## Order

Per SPEC-002 hint: payload normalization (#9) first, parser hardening (#7, #8) next, test additions (#5, #6) last.

## Acceptance hints

- Unit tests for each of the five changes
- Architect parser test covers 3+ malformed input shapes
- autonomous_safe: true (defensive code only, no production-path risk)

## Derived from

SPEC-002 (Reliability Hardening from Grade Followups), Theme C.
