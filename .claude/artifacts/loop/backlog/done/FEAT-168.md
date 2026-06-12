---
id: FEAT-168
title: Slice decomposition gate when effort_points >= 8
status: done
slices_complete: [SLICE-98, SLICE-99, SLICE-100]
completed_at: 2026-06-12
priority: P1
category: workflow
target_release: null
created: 2026-06-09
updated: 2026-06-12
depends_on: [FEAT-167]
slices: [SLICE-98, SLICE-99, SLICE-100]
derived_from: null
source_competitors: []
autonomous_safe: false
tags: [pm, workflow, slice]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.65
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.75
pm_technical_risk: 0.45
pm_dependency_depth: 0.95
composite_score: 0.63
triage_notes: "Decomposition forcing function (FEAT-020 worst case: 15 tasks one slice). Risk band 0.3-0.5: isolated CLI gate ~50 lines, clean rollback, but rollback-after-adoption leaves pending child slices in limbo - documented transition hazard. Cost analog SLICE-83 = effort 0.40. Weak dimension observability 0.66: refuse-path error must be logged, AC-2 underspecifies. Dispatch loop:spec-writer for proposed_slices schema contract. Hard dep FEAT-167 (dependency_depth 0.95)."
github_issue: 191
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/191"
started_at: 2026-06-11
---
# FEAT-168: Slice decomposition gate when effort_points >= 8

## Problem

Large FEATs ship as one slice today because nothing forces decomposition. FEAT-020 is the worst-case example: 15 implementation tasks, 7 dependency waves, single SLICE-1 spanning all of it. Risks:

- Reviewer burnout — one PR diff covers an entire library, CLI, agent, and integration suite.
- Cost-regression false-trip — see FEAT-167.
- All-or-nothing rollback — if one wave fails, the whole slice is parked or reverted.

PM has no signal that a FEAT is too large. Slice-from-feature happily creates a single SLICE for any size.

## Proposal

`/loop:slice-from-feature` refuses to create exactly one slice when `effort_points >= 8`. Forces the user (or PM) to declare a slice breakdown.

PM agent emits `proposed_slices: [...]` during triage when `effort_points >= 8`:

```yaml
proposed_slices:
  - id_suffix: -SLICE-1
    title: Library + unit tests
    points: 5
  - id_suffix: -SLICE-2
    title: CLI + agent
    points: 3
  - id_suffix: -SLICE-3
    title: Integration tests + upstream PR
    points: 5
```

`slice-from-feature` consumes `proposed_slices[]` and creates them all up-front, status `pending` for slices 2+. Slice 1 is the start. Each slice tracks `parent_feat` linkage.

If `proposed_slices` is missing on a `>= 8` FEAT, slice-from-feature errors with a clear message: "FEAT-NNN is sized 13 points — emit `proposed_slices` first via `/loop:pm-review FEAT-NNN`."

## Acceptance criteria

**AC-1: Schema validation for proposed_slices field.** Given a FEAT with `effort_points: 8` and a `proposed_slices` field in YAML frontmatter, when `sliceFromFeature(repoPath, featureId)` is called (from `scripts/loop.mjs slice from-feature --id FEAT-NNN`), then the function MUST validate that `proposed_slices` matches the contract schema exactly:

```typescript
interface ProposedSlice {
  id_suffix: string;      // matches /^-SLICE-\d+$/ (e.g., "-SLICE-1", "-SLICE-2")
  title: string;          // non-empty, <= 100 chars
  points: 1 | 2 | 3 | 5 | 8 | 13;
}
interface ProposedSlicesArray extends Array<ProposedSlice> {
  // sum(points) >= FEAT.effort_points must hold
}
```

Evidence: `src/tests/slice-linker.test.mts` (new test case `proposed_slices_schema_validation` covering valid + invalid cases: malformed id_suffix, empty title, invalid points value, sum < effort_points).

---

**AC-2: Refuse gate with exact error message.** Given a FEAT with `effort_points >= 8` and NO `proposed_slices` field in frontmatter, when `/loop:slice-from-feature --id FEAT-NNN` is invoked, then `sliceFromFeature` library function MUST throw an error with message format: `"FEAT-NNN is sized N points — emit proposed_slices first via /loop:pm-review FEAT-NNN"` (where N is the effort_points value). The calling CLI subcommand (`scripts/loop.mjs::from-feature`) MUST write this error to stderr and set `process.exitCode = 1` (NOT call `process.exit(1)`).

Evidence: `src/tests/slice-linker.test.mts` (new test case `refuse_gate_on_large_feat_without_proposed_slices`; also CLI integration test in a second case, verifying stderr capture and exit code).

---

**AC-3: Audit trail on refuse event.** Given the conditions in AC-2 (large FEAT without proposed_slices), when the refuse error is thrown and caught at the CLI handler level (`scripts/loop.mjs::from-feature` handler), then the error MUST be appended to `.claude/artifacts/loop/auto-dispatch.jsonl` (via `appendAuditLog` from `scripts/lib/auto-dispatch.mjs`) with an audit entry recording: `{ timestamp: ISO-8601, parentCommand: "slice from-feature", featureId: "FEAT-NNN", error: "<message>", ok: false, skipped: false }`. The entry MUST be flushed via `flushAuditLog` before the process exits.

Evidence: `src/tests/slice-linker.test.mts` (new test case `refuse_audit_trail_on_missing_proposed_slices` — verify audit entry appears in the JSONL file with error field populated).

---

**AC-4: Idempotent re-run — no duplicate slices.** Given a FEAT with `effort_points: 8`, `proposed_slices: [{id_suffix: "-SLICE-1", title: "First", points: 5}, {id_suffix: "-SLICE-2", title: "Second", points: 3}]`, and FEAT frontmatter already contains `slices: ["SLICE-01", "SLICE-02"]`, when `/loop:slice-from-feature --id FEAT-NNN` is invoked a second time, then sliceFromFeature MUST NOT allocate new slice ids or write new slice files — it MUST return early with a result indicating all proposed slices are already materialized. Feature frontmatter `slices` array MUST remain `["SLICE-01", "SLICE-02"]` (no duplicates or additions).

Evidence: `src/tests/slice-linker.test.mts` (new test case `idempotent_proposed_slices_rerun` — setup a FEAT with proposed_slices + already-materialized slices, re-run, verify no new slices created and slices array unchanged).

---

**AC-5: Create all proposed slices atomically on happy path.** Given a FEAT with `effort_points: 13` and `proposed_slices: [{id_suffix: "-SLICE-1", title: "Auth", points: 5}, {id_suffix: "-SLICE-2", title: "API", points: 5}, {id_suffix: "-SLICE-3", title: "Integration", points: 3}]`, when `/loop:slice-from-feature --id FEAT-NNN` is invoked on a fresh FEAT (no existing slices), then sliceFromFeature MUST:
- Allocate SLICE ids (e.g., SLICE-01, SLICE-02, SLICE-03) by scanning existing slices under slicesRoot
- Write three slice files under `<slicesRoot>/pending/` with frontmatter `status: "pending"` for SLICE-02 and SLICE-03, `status: "pending"` for SLICE-01 (all initially pending; slice-start ceremony activates SLICE-01)
- Update feature frontmatter `slices: ["SLICE-01", "SLICE-02", "SLICE-03"]`
- Return a result object with `{ slices: [{id: "SLICE-01", path: "...", title: "Auth"}, ...] }`

Evidence: `src/tests/slice-linker.test.mts` (new test case `create_multiple_proposed_slices_happy_path` — verify all three files written, feature cross-links all three, each slice's title matches proposal).

---

**AC-6: PM agent emits proposed_slices in triage output.** Given a FEAT with `effort_points >= 8` during `/loop:pm-review FEAT-NNN` triage, the `loop:pm` agent MUST include a `proposed_slices` block in the updated FEAT frontmatter with at least 2 slices and sum(points) >= effort_points. If PM cannot decompose the FEAT into slices (e.g., genuinely single-wave work), then PM MUST set `composite_priority: "needs-review"` and note in `scopeNotes` that the FEAT requires human review before slicing.

Evidence: Manual test — run `/loop:pm-review` on a new FEAT with `effort_points: 10` and verify the returned FEAT frontmatter includes `proposed_slices` array or escalation note.

---

**AC-7: Parse failure on malformed YAML proposed_slices.** Given a FEAT frontmatter with a malformed `proposed_slices` field (e.g., invalid YAML, missing required keys, non-integer points), when sliceFromFeature is called, it MUST throw an error with message: `"proposed_slices parse failed for FEAT-NNN: <detail>"` (detail describes the specific parse error, e.g., "id_suffix missing in slice 0" or "points value '4' is not in [1, 2, 3, 5, 8, 13]").

Evidence: `src/tests/slice-linker.test.mts` (new test case `proposed_slices_parse_error` — test YAML with missing field, invalid points, etc.; verify error message is specific).

## Out of scope

- Auto-merging completed sub-slices back into the FEAT (existing slice-complete handles closure already).
- Cross-FEAT decomposition (this is single-FEAT only).

## Dependencies

- Hard dep on `[[FEAT-167]]` (needs `effort_points`).

## Related

- `[[FEAT-020]]` (FEAT-020 should have been sized 13 points; would have produced 3 slices instead of one).
