---
phase: "3"
feature: FEAT-069
---
# Run Brief: PHASE3 FEAT069 SLICE70

- Created: 2026-06-07T09:26:31.730Z
- Goal: Remove the deprecated marker-write code path from `src/scripts/lib/auto-dispatch.mts` (per DEC-011). Keep the exported API surface (`dispatchAgent`, `appendAuditLog`, `parseSkipFlag`, `resolveAuditLogPath`) intact. Update tests to remove marker assertions.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/scripts/lib/auto-dispatch.mts` — remove:
  - `PENDING_DISPATCH_REL` constant
  - marker directory `mkdir` call
  - marker `writeFile` call
  - `output: "<marker-written:..."` string → replace with `output: "<dispatch-acknowledged>"`
  - any `fs` import only used for marker writes (if `appendAuditLog` still needs fs
  - keep it)
- `src/tests/auto-dispatch.test.mts` — drop assertions that check for marker file existence/content
- `scripts/lib/auto-dispatch.mjs` — recompile via `npm run build` (compiled artifact must match source)
- `tests/auto-dispatch.test.mjs` — recompile via `npm run build`
- Out Of Scope:
  - - Phase A3 one-shot migrators (`adhoc-migrator`
  - `legacy-migrator`
  - `codemod-add-any`
  - `migrate-product-backlog`) — separate slice
- Any changes to callers outside `auto-dispatch.mts` itself
- No changes to `dispatchAgent`
  - `appendAuditLog`
  - `parseSkipFlag`
  - `resolveAuditLogPath` signatures
- Planned Files: -
- Next Step: Begin implementation

