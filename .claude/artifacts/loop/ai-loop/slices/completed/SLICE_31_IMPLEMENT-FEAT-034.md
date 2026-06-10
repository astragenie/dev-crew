---
id: SLICE-31
status: completed
feature: FEAT-034
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 73
github_url: "https://github.com/sergeymilashico/loop/issues/73"
---
# SLICE-31: configurable auditLogPath (FEAT-034 Issue #3)

Implements **Issue #3** of FEAT-034 (SPEC-002 Theme A). Issue #1 landed as SLICE-30. Issue #2 (builder mid-cleanup stop investigation) is out of scope here — it cross-references FEAT-032 research spike.

## Objective

`auto-dispatch.mjs::appendAuditLog` hardcodes the audit log path to `<repoRoot>/.claude/artifacts/loop/auto-dispatch.jsonl`. This blocks multi-workspace deployments + makes the path untestable across fixtures sharing a workspace. Read the path from `loop.json::auditLogPath` (new key) with fallback to the current default. Same fallback applies when no config is provided.

## Behavior contract

1. `appendAuditLog(repoPath, entry, opts?)` accepts an optional `opts.config` argument.
2. Resolution order for the log path:
   - `opts.config?.loop?.auditLogPath` (string, treated as repo-relative if not absolute)
   - default: `<repoRoot>/.claude/artifacts/loop/auto-dispatch.jsonl` (current behavior)
3. If config is not passed, resolve via `resolveConfig(repoPath)` to pick up the key from `loop.json`. Caller may pass pre-resolved config to skip the lookup.
4. All current callers continue to work unchanged: passing no `opts` still resolves to the default path.

## In scope

- `src/scripts/lib/auto-dispatch.mts`:
  - Extend `appendAuditLog` signature to accept optional `opts: { config?: any }`
  - Add internal helper `resolveAuditLogPath(repoPath, opts)` exported for unit tests
  - Path resolution honors absolute paths verbatim; relative paths resolved against `repoPath`
  - Default path string remains `.claude/artifacts/loop/auto-dispatch.jsonl`
- `src/tests/auto-dispatch.test.mts` extend with new cases (don't rewrite existing tests):
  - Default path used when no config passed
  - Default path used when config has no `auditLogPath` key
  - Custom relative path used when set (resolved against repoPath)
  - Custom absolute path used when set (verbatim)
  - Existing test for `dispatchAgent` with audit log entry still passes (regression guard)

## Out of scope

- Issue #2 (builder mid-cleanup stop investigation) — cross-reference FEAT-032
- Changes to call sites that pass through `dispatchAgent` (they get the new behavior via auto-dispatch internals)
- Renaming `auto-dispatch.jsonl` default filename
- Multi-tenant audit log rotation / size cap

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new appendAuditLog cases)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: Unit test: default path used when no config passed
- [ ] AC-5: Unit test: custom relative path resolved against `repoPath`
- [ ] AC-6: Unit test: custom absolute path used verbatim
- [ ] AC-7: Live smoke: add `"auditLogPath": ".claude/artifacts/loop/custom-audit.jsonl"` to a tmp `loop.json`, run `dispatchAgent` against that repo path, confirm log line lands at the custom path (delete tmp after)
- [ ] AC-8: Existing audit-log writes from researcher / architect / doc-writer / marker-drain continue to land at the default path (no regression)

## Done When

- All ACs PASS
- FEAT-034 stays `in-progress` (Issue #2 remains)
- Crew `final-synthesis` written
- Grade written
- `requires_validation: false` — covered by unit tests + live smoke

## Reviewer ladder

- **Reviewer A** — Engineering pass: signature backwards-compatible (opts optional), path resolution correctness (absolute vs relative), no behavior change for existing callers, helper exported cleanly.
- **Reviewer B** — Production-readiness pass: behavior when `loop.json` is missing or unreadable (fall back to default, don't throw), behavior when custom path's parent dir doesn't exist (create or fail loudly?), backwards compat for downstream tools reading the default path.

## Risks

- **Existing callers break**: extending `appendAuditLog` signature could miss a call site. Mitigation: keep `opts` optional with default `{}`; all current calls work without modification.
- **Custom path parent dir missing**: `fs.appendFile` will fail. Mitigation: ensure parent dir before append (matches current behavior at the default path).
- **Config resolution recursion**: `appendAuditLog` calling `resolveConfig` which somehow logs audit. Mitigation: prefer `opts.config` from caller; only call `resolveConfig` lazily when no config passed.

## Open questions

(none)
