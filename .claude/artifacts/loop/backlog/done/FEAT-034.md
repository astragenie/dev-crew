---
id: FEAT-034
status: done
priority: P1
category: infra-bug
target_release: null
created: 2026-06-04
updated: 2026-06-04
depends_on: []
slices: [SLICE-30, SLICE-31]
derived_from: SPEC-002
autonomous_safe: true
triage_notes: "autonomous_safe inferred: AC count=0, derived_from=SPEC-002 → true"
started_at: 2026-06-04
slices_complete: [SLICE-30, SLICE-31]
completed_at: 2026-06-04
shipped_scope_note: "Issue #1 (SLICE-30 marker drain) + Issue #3 (SLICE-31 auditLogPath config) shipped. Issue #2 (builder mid-cleanup investigation) deferred to FEAT-032 which already covers the research spike for that exact pattern."
github_issue: 71
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/71"
---
## Description

Three operational gaps in dispatch + ceremony machinery, surfaced as SPEC-002 Theme A. Issues #1, #2, #3 from SPEC-002.

### Issue #1 — Pending-dispatch marker accumulation
Marker files at `.claude/artifacts/loop/pending-dispatch/` accumulate with no cleanup consumer (SLICE-23/27/28 grades). Builder needs to drain markers on slice complete (or a TTL-based cleanup).

### Issue #2 — Builder mid-cleanup stop pattern
Builder stops mid-cleanup recurring across SLICE-23/25/26/27. SLICE-27 grade hypothesis: 'crew:builder turn budget or context window is hitting a ceiling during final synthesis writes.' Need instrumentation: capture turn budget remaining at builder exit + emit warning on close ceremony if at ceiling.

### Issue #3 — Hardcoded auto-dispatch.jsonl path
Path currently `<repoRoot>/.claude/artifacts/loop/auto-dispatch.jsonl`. Blocks multi-workspace. Should read from `loop.json` `auditLogPath` key with default fallback.

## Acceptance hints

- Marker drain consumer in `slice-complete.mts`; TTL-based cleanup as fallback
- Turn-budget instrumentation logged in builder exit; warning surfaced in close ceremony when at ceiling
- `loop.json::auditLogPath` read by dispatch; default falls back to current hardcoded path
- Unit tests for each of the three changes
- autonomous_safe: false (architect pre-dispatch required, human review on dispatch lifecycle)

## Derived from

SPEC-002 (Reliability Hardening from Grade Followups), Theme A.
