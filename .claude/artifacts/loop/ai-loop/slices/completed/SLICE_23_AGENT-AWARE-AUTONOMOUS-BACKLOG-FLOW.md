---
id: SLICE-23
status: completed
feature: FEAT-028
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 58
github_url: "https://github.com/sergeymilashico/loop/issues/58"
---
# SLICE-23: auto-dispatch infrastructure foundation (FEAT-028 SLICE-A)

Implements **SLICE-A** of FEAT-028. See [feature file](../../../backlog/in-progress/FEAT-028.md) for full product context. Subsequent slices (SLICE-B/C/D) consume this foundation to wire researcher / architect / document-writer into backlog-add / spec-decompose / slice-complete.

## Objective

Land a single shared `auto-dispatch` module that downstream slices use to spawn role agents from inside loop CLI commands. The module owns: agent dispatch invocation, opt-out flag parsing, audit logging, try-catch isolation, and cost-warn logging. Zero behavior change to existing commands in this slice — pure scaffolding + tests.

## In scope

- New `src/scripts/lib/auto-dispatch.mts` exporting:
  - `dispatchAgent({ agent, prompt, opts })` → returns `{ ok, output, error, costUsd, durationMs, skipped, skipReason }`
  - Honors `opts.skipFlag` (e.g. `--no-research`); if flag set in `opts.argv`, returns `{ ok: true, skipped: true, skipReason: "opt-out" }`
  - Wraps spawn in try-catch; on failure returns `{ ok: false, error, skipped: false }` (never throws)
  - Appends one JSON line per invocation to `.claude/artifacts/loop/auto-dispatch.jsonl` with shape `{ timestamp, agent, parentCommand, costUsd, durationMs, ok, skipped, skipReason }`
  - Reads cost-advisor verdict (if available); when verdict is `warn` or worse, logs `[auto-dispatch] cost-warn proceeding anyway` but still runs (matches FEAT-028 decision)
- `parseSkipFlag(argv, flagName)` helper exported alongside, pure / unit-testable
- `appendAuditLog(repoRoot, entry)` helper exported alongside, pure / unit-testable
- New test file `src/tests/auto-dispatch.test.mts` covers:
  - opt-out flag honored → returns skipped=true, no dispatch
  - dispatch failure → returns ok=false, parent does NOT throw
  - audit log file created on first call, appended on subsequent calls
  - cost-warn does NOT skip dispatch (log only)
  - flag parser handles `--no-research`, `--no-architect`, `--no-doc-writer` independently

## Out of scope

- Wiring into `/loop:backlog-add`, `/loop:spec-decompose`, `/loop:slice-complete` (SLICE-B/C/D respectively)
- Researcher / architect / document-writer prompt content changes (already authored)
- Cost-advisor implementation (consume existing if present; stub `{ verdict: "ok" }` if absent)
- Async / background dispatch primitives (SLICE-D adds when needed)
- CLI changes to existing commands (this slice adds NO new CLI surface)

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new auto-dispatch tests) with zero failures
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` all clean
- [ ] AC-3: `node scripts/validate-manifests.mjs` + `node scripts/validate-content-length.mjs` both pass
- [ ] AC-4: `scripts/lib/auto-dispatch.mjs` exists and exports `dispatchAgent`, `parseSkipFlag`, `appendAuditLog`
- [ ] AC-5: Unit test proves opt-out flag short-circuits dispatch (no spawn, returns `{ ok: true, skipped: true }`)
- [ ] AC-6: Unit test proves dispatch failure isolated (`ok: false` returned, no throw escapes)
- [ ] AC-7: Unit test proves audit log written to `.claude/artifacts/loop/auto-dispatch.jsonl` with required fields
- [ ] AC-8: Unit test proves cost-warn verdict logs but proceeds with dispatch

## Done When

- All ACs PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- Feature FEAT-028 stays `in-progress` (3 more slices to follow)
- Crew `final-synthesis` artifact written linking SLICE-23 evidence
- Grade written

## Reviewer ladder

- **Reviewer A** — Engineering pass: API surface ergonomics for downstream consumers (B/C/D), error semantics (when does ok=false vs throw), test isolation (no side effects on .claude/artifacts/loop/auto-dispatch.jsonl in shared test fixtures), tsc + lint cleanliness.
- **Reviewer B** — Security + production-readiness pass: audit log path traversal safety (repoRoot validation), JSON line serialization (no PII leakage), failure-mode coverage (network timeout / agent crash / disk full when writing audit log), backwards compatibility (does NOT change any existing command behavior).

## Risks

- **Agent dispatch API surface unknown**: how do we actually spawn a sub-agent from inside a Node CLI? Two options: (a) shell out to `claude` CLI with the agent name + prompt as args; (b) write a marker file that a hook picks up. Need to research / decide during DISCOVER phase.
- **Cost-advisor integration may not exist yet**: stub if absent; document follow-up.
- **Audit log race conditions**: concurrent dispatches could interleave JSON lines. Mitigation: append-only with atomic writes (single `fs.appendFile` call per entry).

## Open questions

- Q1: How does this plugin currently invoke sub-agents from a CLI command (vs from Claude Code's Agent tool)? If no precedent exists, SLICE-A may need to land a research-spike sub-task before final API shape.
- Q2: Should `dispatchAgent` be sync (block CLI) or async (return promise + let caller decide)? Default async — caller awaits if needed.
