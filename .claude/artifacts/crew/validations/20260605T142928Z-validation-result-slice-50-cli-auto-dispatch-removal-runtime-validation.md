# Validation Result: SLICE-50: CLI auto-dispatch removal runtime validation

- Created: 2026-06-05T14:29:28.906Z
- Validator: validator
- Environment: local, Node v24.16.0, Windows 11, branch feat/triage-consolidation commit 7e8790a
- Decision: passed
- Scenario: Confirm all 6 runtime scenarios for SLICE-50 (FEAT-049 CLI auto-dispatch removal) behave per contract
- Evidence Collected:
  - AC-1: npm test 772/772 pass exit 0. AC-2 (backlog enrich): exit 1
  - stderr contains 'DEC-011'+'loop:backlog-enrich'
  - 0 marker files
  - audit log skipReason=cli-refusal. AC-3 (backlog add no --body): exit 0
  - FEAT created with empty body template
  - stderr contains DEC-011+/loop:backlog-add
  - audit skipReason=cli-refusal-researcher-disabled. AC-4 (spec decompose): exit 1
  - stderr contains 'DEC-011'+'/loop:spec-decompose'+'--features'
  - audit skipReason=cli-refusal-architect-disabled. AC-5 (slice complete): exit 0
  - slice moved to completed
  - 0 marker files
  - audit skipReason=cli-refusal-cli-doc-writer-disabled. Backward-compat: --no-research exit 0 + stderr deprecation note citing DEC-011; --no-architect exit 1 (refusal still fires) + deprecation note; --no-doc-writer exit 0 + deprecation note. All three flags accepted without unknown-flag crash.
- Files / Surfaces Checked:
  - scripts/loop.mjs
  - scripts/lib/slice-linker/complete-slice.mjs
  - src/scripts/loop.mts
  - src/scripts/lib/slice-linker/complete-slice.mts
- Risks: classifySlice in feature-lifecycle.mts still calls dispatchAgent (OQ-4 deferred per DEC-011) — marker files continue to accumulate from that path. --no-architect with spec decompose still exits 1 (refusal fires regardless of flag) — this is correct behavior but differs from --no-research (exit 0). Minor: skipReason for researcher uses 'cli-refusal-researcher-disabled' vs enrich's 'cli-refusal' — slight inconsistency in naming, non-blocking.
- Required Follow-up: Follow-up FEAT for classifySlice/feature-lifecycle.mts (OQ-4). Cleanup of deprecated flags once telemetry confirms zero usage.

