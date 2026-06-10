---
id: SLICE-70
status: completed
feature: FEAT-069
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [refactor, infra]
needs_contract: false
needs_ux: false
skip: [architect, uxdesigner]
completed_at: 2026-06-07
github_issue: 146
github_url: "https://github.com/sergeymilashico/loop/issues/146"
---
# SLICE-70: A2 — delete marker-write path in auto-dispatch

Implements FEAT-069 Phase A2. See [feature file](../../../backlog/in-progress/FEAT-069.md) for product context.

## Objective

Remove the deprecated marker-write code path from `src/scripts/lib/auto-dispatch.mts`
(per DEC-011). Keep the exported API surface (`dispatchAgent`, `appendAuditLog`,
`parseSkipFlag`, `resolveAuditLogPath`) intact. Update tests to remove marker assertions.

## In scope

- `src/scripts/lib/auto-dispatch.mts` — remove:
  - `PENDING_DISPATCH_REL` constant
  - marker directory `mkdir` call
  - marker `writeFile` call
  - `output: "<marker-written:..."` string → replace with `output: "<dispatch-acknowledged>"`
  - any `fs` import only used for marker writes (if `appendAuditLog` still needs fs, keep it)
- `src/tests/auto-dispatch.test.mts` — drop assertions that check for marker file existence/content
- `scripts/lib/auto-dispatch.mjs` — recompile via `npm run build` (compiled artifact must match source)
- `tests/auto-dispatch.test.mjs` — recompile via `npm run build`

## Out of scope

- Phase A3 one-shot migrators (`adhoc-migrator`, `legacy-migrator`, `codemod-add-any`, `migrate-product-backlog`) — separate slice
- Any changes to callers outside `auto-dispatch.mts` itself
- No changes to `dispatchAgent`, `appendAuditLog`, `parseSkipFlag`, `resolveAuditLogPath` signatures

## Acceptance criteria

- [ ] AC-1: `src/scripts/lib/auto-dispatch.mts` contains no reference to `PENDING_DISPATCH_REL`, no marker `mkdir`, no marker `writeFile`
- [ ] AC-2: `dispatchAgent` return value's `output` field reads `"<dispatch-acknowledged>"` (not `"<marker-written:..."`)
- [ ] AC-3: `npm run typecheck` exits 0
- [ ] AC-4: `npm run lint` exits 0 with zero warnings
- [ ] AC-5: `npm test` exits 0 (all tests pass; test count drop, if any, matches removed marker-assertion cases)
- [ ] AC-6: No Phase A3 migrator modules touched

## Done When

- all acceptance criteria PASS with evidence
- `requires_validation: false` waives validation gate (pure dead-code removal, no behavior surfaced to users)
- Crew `final-synthesis` artifact written

## Reviewer ladder

- Reviewer A: crew:reviewer
- Reviewer B: n/a (mechanical delete)
