---
id: FEAT-037
status: done
priority: P3
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-35]
derived_from: null
autonomous_safe: false
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=null → false"
started_at: 2026-06-04
slices_complete: [SLICE-35]
completed_at: 2026-06-04
github_issue: 78
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/78"
---
## Description

Closes the test-additions half of FEAT-036 (SPEC-002 Theme C) deferred from SLICE-33. Three test gaps:

### Issue #5 — Skipped docwriter regression test
`test.skip` in `src/tests/slice-complete-docwriter.test.mts` since SLICE-27 (fixture didn't satisfy `findFeatureById` + `feature_complete` invariants). Refactor fixture to use real `slice-from-feature` flow, or drop the test as duplicative with `slice-complete-multi-slice.test.mts`.

### Issue #6 — gh_unavailable path untested
FEAT-009 SLICE-22 PR autofix loop has no test for `ghExec` throws path. Add defensive unit test.

### Issue #7 — gh JSON schema validation gap
FEAT-009 SLICE-22 `fetchPrStatus` parses gh JSON output with no shape validation. Add runtime check that throws clearly on schema mismatch + test that exercises the throw.

## Notes

- SPEC-002 auto-rolled to `satisfied` when SLICE-33 closed FEAT-036, but these three issues were deferred. This FEAT closes the AC-4 traceability gap. See GRADE-SLICE-33 Surprises + Followups.
- autonomous_safe: true — pure test additions, no production-path risk.

## Acceptance hints

- Three unit tests covering issues #5, #6, #7
- docwriter regression test runs without `.skip`
- gh JSON schema validator + test
- gh_unavailable test asserts caller handles `ghExec` throw gracefully
