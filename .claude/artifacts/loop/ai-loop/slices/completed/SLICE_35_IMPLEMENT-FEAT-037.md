---
id: SLICE-35
status: completed
feature: FEAT-037
phase: null
priority: P3
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
---
# SLICE-35: test additions for pr-fixer gh paths (FEAT-037 Issues #6 + #7)

Implements **Issues #6 and #7** of FEAT-037. **Issue #5 is already resolved** — the skipped docwriter regression test was deleted as duplicative in commit acd5657 (post-v0.7.0 housekeeping); the comment block at `src/tests/slice-complete-docwriter.test.mts` already documents the rationale.

## Objective

Add test coverage for two underspecified paths in `src/scripts/lib/pr-fixer.mts`:

1. **gh_unavailable** — when `ghExec` throws (gh CLI missing), `fetchPrStatus` must return `{ raw: null, haltReason: "gh_unavailable" }` cleanly without propagating the error.
2. **gh JSON schema validation** — when `gh pr view` returns valid JSON but the shape is wrong (missing required fields, wrong types), the caller should throw with a clear message rather than silently consume malformed data.

## Behavior contract for Issue #7

Add a minimal schema validator inline in `src/scripts/lib/pr-fixer.mts::fetchPrStatus`. After `JSON.parse`, assert:

- `typeof parsed === "object" && parsed !== null`
- `typeof parsed.title === "string"`
- `typeof parsed.state === "string"`
- `Array.isArray(parsed.reviews)`
- `Array.isArray(parsed.comments)`

On mismatch: throw `Error("gh pr view returned unexpected JSON shape: <field> must be <type>")`.

## In scope

- `src/scripts/lib/pr-fixer.mts` — add `assertPrViewShape(parsed)` helper + call from `fetchPrStatus` after JSON.parse
- `src/tests/pr-fixer.test.mts` — add tests:
  - `fetchPrStatus` with mock `ghExec` that throws → returns `{ raw: null, haltReason: "gh_unavailable" }`, does NOT propagate
  - `fetchPrStatus` with mock `ghExec` returning valid JSON but missing `title` → throws with message containing "title"
  - `fetchPrStatus` with mock `ghExec` returning valid JSON but `reviews` not array → throws with message containing "reviews"
  - `fetchPrStatus` with mock `ghExec` returning well-formed JSON → succeeds, returns parsed data

## Out of scope

- Refactoring `fetchPrStatus` beyond adding the shape assert
- Changes to other `pr-fixer.mts` functions
- Issue #5 — already addressed by prior deletion

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new pr-fixer tests)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: Unit test: gh-unavailable → `{ haltReason: "gh_unavailable" }`
- [ ] AC-5: Unit test: malformed JSON missing required field → throws with descriptive message
- [ ] AC-6: Unit test: well-formed JSON → returns parsed data unchanged
- [ ] AC-7: `assertPrViewShape` helper exported for unit testability

## Done When

- All ACs PASS
- FEAT-037 moves to `done/`
- Crew `final-synthesis` written
- Grade written
- `requires_validation: false`

## Reviewer ladder

- **Reviewer A** — Engineering pass: shape assert is precise (matches what `gh pr view` returns), error message identifies the failing field, tests cover all three new branches, no behavior change to happy path.
- **Reviewer B** — Production-readiness pass: schema assert tolerant of future `gh` CLI additions (only checks required-field presence), throw message does not leak sensitive data.

## Risks

- **Schema too strict**: future `gh` CLI versions could omit a field. Mitigation: assert only on the fields `fetchPrStatus` actually consumes.
- **Existing pr-fixer tests break**: shape assert may trip on existing mock fixtures. Mitigation: scan `pr-fixer.test.mts` first; update fixtures if needed.
