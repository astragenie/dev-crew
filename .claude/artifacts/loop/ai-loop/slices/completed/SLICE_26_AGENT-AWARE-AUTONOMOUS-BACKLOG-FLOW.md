---
id: SLICE-26
status: completed
feature: FEAT-028
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 60
github_url: "https://github.com/sergeymilashico/loop/issues/60"
---
# SLICE-26: architect auto-dispatch into `/loop:spec-decompose` (FEAT-028 SLICE-C)

Implements **SLICE-C** of FEAT-028. SLICE-A landed `auto-dispatch.mts` (SLICE-23). SLICE-B landed researcher into `backlog-add` (SLICE-25). See [feature file](../../../backlog/in-progress/FEAT-028.md) for full product context.

## Objective

Auto-dispatch the `loop:architect` agent inside `/loop:spec-decompose` when the caller does not supply `--features`. Architect produces a structured decomposition artifact (FEAT titles + scope + out-of-scope + technical_risk hint + autonomous_safe hint) which the CLI consumes as `--features-file`. Always-on with `--no-architect` opt-out. Incomplete-SPEC (missing objective / scope frontmatter) emits warning + proceeds with architect best-effort decomposition.

## In scope

- `src/scripts/loop.mts` (`spec decompose` subcommand) — wire architect dispatch:
  - When `--features` provided → skip architect (caller already has decomposition)
  - When `--no-architect` → skip architect (explicit opt-out)
  - When SPEC frontmatter missing `objective` or `scope` → log warning, proceed with architect best-effort
  - Otherwise → dispatch `loop:architect` with prompt that returns a parseable decomposition block; consume as `--features` value
  - Dispatch via `dispatchAgent` from SLICE-A; `parentCommand: "spec-decompose"`, `skipFlag: "--no-architect"`
  - Test injection seam: optional `dispatchFn` parameter (mirror SLICE-B pattern)
  - Architect failure → log error, fall back to abort with helpful message (decompose without architect = poor quality FEATs); CLI returns non-zero exit code
- `src/scripts/lib/spec-decomposer.mts` (or wherever decompose logic lives) — accept optional `featuresOverride` array from architect output
- Architect output parser — accept either semicolon-separated string OR newline-separated structured block (one FEAT per paragraph with optional scope/risk hints); convert to internal feature list
- `src/tests/spec-decompose-architect.test.mts` (new) — behavior tests:
  - With `--features "a; b; c"` → architect NOT dispatched (audit log has no entry)
  - With `--no-architect` → architect skipped via opt-out (audit log entry has `skipped: true`)
  - Default (neither flag) → architect dispatched (audit log entry written); FEATs created from parsed output
  - With architect failure → CLI does NOT throw; exits with helpful error; no partial FEATs created
  - With incomplete SPEC (missing objective frontmatter) → warning logged, dispatch proceeds
  - Pre-existing `tests/specs.test.mjs` or equivalent stays green (regression guard)

## Out of scope

- Document-writer into `/loop:slice-complete` (SLICE-D / SLICE-27)
- Brainstorming dispatch on incomplete SPECs (per FEAT-028 design decision: skip brainstorming + warn)
- Changes to the `loop:architect` agent prompt itself
- Async dispatch primitives
- Retrospective SPEC authoring helpers
- Changes to spec-add or other spec commands

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests, ~595 total)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `node scripts/loop.mjs spec decompose --repo "$PWD" --id <SPEC-ID> --features "a; b; c"` works unchanged (regression preserved)
- [ ] AC-5: `node scripts/loop.mjs spec decompose --repo "$PWD" --id <SPEC-ID> --no-architect` exits with helpful error (architect needed for decomposition without --features); audit log has skip entry
- [ ] AC-6: Unit test proves dispatch with both flags missing triggers architect dispatch and produces FEATs
- [ ] AC-7: Unit test proves architect failure does NOT throw — CLI exits with helpful error message
- [ ] AC-8: Unit test proves incomplete-SPEC (missing objective) logs warning and proceeds
- [ ] AC-9: No regression on pre-existing spec-decompose tests

## Done When

- All ACs PASS with evidence
- Feature FEAT-028 stays `in-progress` (SLICE-D remains)
- Crew `final-synthesis` artifact written
- Grade written
- `requires_validation: false` — covered by unit tests + live smoke

## Reviewer ladder

- **Reviewer A** — Engineering pass: dispatch wiring, argv plumbing, error isolation, test mock pattern reuse from SLICE-B, parser correctness (architect output format), no regression on existing spec-decompose behavior.
- **Reviewer B** — Production-readiness pass: name-collision avoidance (this dispatches the `loop:architect` AGENT, not the `commands/architect.md` CLI per FEAT-028 note); audit log integration; backwards compat with callers who still pass `--features`; behavior when both `--features` and `--no-architect` are passed (should be `--features` wins — no architect dispatch needed).

## Risks

- **Name collision**: `commands/architect.md` (CLI, 2-model split) vs `agents/architect.md` (agent). Dispatch the AGENT via `dispatchAgent({ agent: "loop:architect" })` — never invoke the CLI. Flagged in FEAT-028 body.
- **Architect output parsing**: free-form prose vs structured. Mitigation: prompt the architect to return a specific format (semicolon-separated titles minimum; structured block as bonus); parser tolerates both.
- **Incomplete-SPEC quality risk**: architect best-effort on a half-baked SPEC may produce low-quality FEATs that pollute backlog. Mitigation: log warning prominently; FEAT-028 accepts this tradeoff.
- **Test pollution**: live smoke might create real FEATs in pending/. Mitigation: stub `dispatchFn` in smoke tests; if a real dispatch is needed, `rm` the created FEAT before commit.

## Open questions

- Q1: Where does `spec decompose` currently parse `--features`? Likely `src/scripts/lib/spec-decomposer.mts`.
- Q2: How does the CLI surface SPEC frontmatter (objective/scope)? Need to read spec body or frontmatter to detect incompleteness.
