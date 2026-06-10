---
id: SLICE-25
status: completed
feature: FEAT-028
phase: null
priority: P1
target_release: null
requires_validation: false
created: 2026-06-04
updated: 2026-06-04
completed_at: 2026-06-04
github_issue: 59
github_url: "https://github.com/sergeymilashico/loop/issues/59"
---
# SLICE-25: researcher auto-dispatch into `/loop:backlog-add` (FEAT-028 SLICE-B)

Implements **SLICE-B** of FEAT-028 (SLICE-A landed as SLICE-23 — auto-dispatch foundation module). See [feature file](../../../backlog/in-progress/FEAT-028.md) for full product context.

## Objective

Auto-dispatch the `loop:researcher` agent inside the `backlog add` CLI command so every new FEAT lands with citation-backed body content, not the placeholder template. Uses the `dispatchAgent` primitive from SLICE-A. Always-on with `--no-research` opt-out per FEAT-028 design decision (no skip heuristics; cost-warn proceeds anyway).

## In scope

- `src/scripts/loop.mts` (`backlog add` subcommand) — wire in researcher dispatch BEFORE the FEAT file is written:
  - When user passes `--body`, skip researcher (user already supplied context)
  - When user passes `--no-research`, skip researcher (explicit opt-out)
  - Otherwise dispatch `loop:researcher` with prompt: `"Research repo context relevant to the new FEAT titled '<title>'. Find prior FEATs in done/in-progress, recent grades mentioning this area, decisions affecting it. Return a 200-400 word findings document with file:line citations suitable for use as the FEAT body."`
  - Pass `parentCommand: "backlog-add"`, `skipFlag: "--no-research"`, `argv: process.argv`
  - Researcher output replaces the placeholder body in the new FEAT file
  - Researcher failure or `{ skipped: true }` → fall back to placeholder body (existing behavior); CLI does NOT throw
- `src/scripts/lib/backlog-writer.mts` (or wherever the FEAT file is written) — accept an optional `body` override parameter; if provided, replace template body; if not, use template default
- `src/tests/backlog-add-research.test.mts` — new behavior tests:
  - With `--body`, researcher NOT dispatched (assertion: no audit log entry for researcher)
  - With `--no-research`, researcher NOT dispatched (audit log entry has `skipped: true`)
  - With neither flag, researcher dispatched (audit log entry written, body merged into FEAT file)
  - With researcher dispatch failure, FEAT still created with placeholder body (resilience)
  - Audit log written to `<repoRoot>/.claude/artifacts/loop/auto-dispatch.jsonl`

## Out of scope

- Architect into `/loop:spec-decompose` (SLICE-C / SLICE-26)
- Document-writer into `/loop:slice-complete` (SLICE-D / SLICE-27)
- Researcher prompt content changes beyond what's needed for this integration
- Cost-advisor implementation (consume existing if present; pass `costAdvisor` undefined if absent)
- Async dispatch primitives (SLICE-D adds when needed)
- 60s / 20-file caps from FEAT-028 risk section — those are researcher-internal limits; out of scope here unless `dispatchAgent` already exposes them
- Changes to `loop:researcher` agent prompt itself

## Acceptance criteria

- [ ] AC-1: `npm test` passes (full suite + new tests, ~585 total)
- [ ] AC-2: `npm run lint`, `npm run typecheck`, `npm run format:check` clean
- [ ] AC-3: Manifest + length validators OK
- [ ] AC-4: `node scripts/loop.mjs backlog add --repo "$PWD" --title "Test research auto-dispatch" --no-research` creates FEAT with placeholder body AND audit log has matching `skipped: true` entry
- [ ] AC-5: `node scripts/loop.mjs backlog add --repo "$PWD" --title "..." --body "explicit body"` creates FEAT with the explicit body, no researcher dispatch (no audit entry)
- [ ] AC-6: `node scripts/loop.mjs backlog add --repo "$PWD" --title "..."` (no flags) attempts researcher dispatch; audit log entry written; FEAT created either way (body from researcher OR placeholder fallback if dispatch fails)
- [ ] AC-7: Unit test proves researcher dispatch failure does NOT throw — `backlog add` always returns successfully with a FEAT file written
- [ ] AC-8: Pre-existing `tests/backlog.test.mjs` still passes unchanged (no regression on existing backlog-add behavior when researcher is unavailable / skipped)

## Done When

- All ACs PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- Feature FEAT-028 stays `in-progress` (2 more slices remain: C + D)
- Crew `final-synthesis` artifact written
- Grade written
- `requires_validation: false` — CLI integration covered by unit tests; manual smoke test confirms; no UI surface

## Reviewer ladder

- **Reviewer A** — Engineering pass: dispatch wiring correctness (argv plumbing, parentCommand string, skipFlag value), error isolation (researcher failure path), test mocking strategy (how is `dispatchAgent` stubbed in tests — actual dispatch in tests would leave files in the real audit log), backwards compat with existing `tests/backlog.test.mjs`.
- **Reviewer B** — Production-readiness pass: marker-file accumulation under repeated `backlog add` calls (per DEC-004); audit log path traversal safety (already covered by SLICE-A but recheck the integration site); body content sanitization (researcher output is markdown — does it need escaping before merging into FEAT file?); CLI exit-code behavior unchanged.

## Risks

- **Test fixture dispatch leakage**: easy to accidentally invoke the real researcher in tests. Mitigation: inject a `dispatchAgent` mock via test-only env var or constructor override.
- **Researcher prompt may produce content with markdown that breaks FEAT frontmatter parsing**: mitigation — sanity check that returned body does not contain a `---` line at the top.
- **CLI test flakiness from real subprocess spawn**: stub `dispatchAgent` rather than spawn `node` directly in tests.

## Open questions

- Q1: Where exactly does `backlog add` write the FEAT file? Need to find the right hook point. Likely `src/scripts/lib/backlog-writer.mts` or equivalent in `scripts/loop.mts` itself.
- Q2: Does `dispatchAgent` need any plumbing changes to support test-injection of a mock? If yes, that's a small SLICE-A follow-up rather than SLICE-B work.
