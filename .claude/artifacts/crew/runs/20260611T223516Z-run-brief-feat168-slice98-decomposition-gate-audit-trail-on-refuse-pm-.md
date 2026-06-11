---
feature: FEAT-168
status: active
---
# Run Brief: FEAT168 SLICE98: Decomposition gate: audit trail on refuse + PM emit proposed_slices rule (FEAT-168 slice-a)

- Created: 2026-06-11T22:35:16.607Z
- Tier: full
- Goal: 1. Make the decomposition refuse-gate observable: every time `sliceFromFeature` throws `DecompositionRequiredError`, append a structured entry to `.claude/artifacts/loop/auto-dispatch.jsonl` so post-hoc audits can count refuse events. 2. Teach the PM agent to emit `proposed_slices` during triage when `effort_points >= 8`, so refuse-gate trips are rare.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/loop.mts` — `from-feature` CLI handler wraps `sliceFromFeature(...)` in try/catch. On `DecompositionRequiredError` (use `instanceof` from `./lib/proposed-slices.mjs`)
  - call `appendAuditLog(repoPath
  - { timestamp
  - parentCommand: "slice from-feature"
  - featureId
  - error: err.message
  - ok: false
  - skipped: false })`. Re-throw so caller sees the error (existing dispatcher already maps throws to `exitCode = 1`). Audit-log flush already runs in the `try/finally` at the dispatcher level.
- New test `src/tests/cli-from-feature-audit.test.mts` — programmatically invoke the `from-feature` handler against a tmp repo with a `effort_points: 8` FEAT lacking `proposed_slices`
  - assert the throw
  - then read `.claude/artifacts/loop/auto-dispatch.jsonl` and verify the audit entry shape (all six fiel
- Out Of Scope:
  - - AC-4 idempotent rerun consuming `proposed_slices[]` - needs parser fix first.
- AC-5 atomic multi-slice creation from `proposed_slices[]` - needs parser fix first.
- Parser fix itself (frontmatter writer round-tripping nested mappings inside YAML arrays) - separate slice.
- Planned Files: -
- Next Step: Begin implementation

