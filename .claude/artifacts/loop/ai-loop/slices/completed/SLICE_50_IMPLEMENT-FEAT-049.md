---
id: SLICE-50
status: completed
feature: FEAT-049
phase: null
priority: P1
target_release: null
requires_validation: true
created: 2026-06-05
updated: 2026-06-05
completed_at: 2026-06-05
---
# SLICE-50: Implement FEAT-049

Implements FEAT-049. See [feature file](../../../backlog/in-progress/FEAT-049.md) for product context.

## Objective

`src/scripts/lib/auto-dispatch.mts::dispatchAgent` writes a marker file to `.claude/artifacts/loop/pending-dispatch/\<timestamp\>-\<agent\>.json` and returns immediately with `output: "\<marker-written:...\>"`. No process consumes those markers — they accumulate.

## In scope

- Remove `dispatchAgent` invocations from the four affected CLI subcommands (`/loop:backlog enrich`, `/loop:backlog add` researcher path, `/loop:spec decompose` architect path, `/loop:slice complete` async doc-writer)
- Each affected CLI surface exits with a clear refusal message pointing at the corresponding slash command (Claude-driven orchestration is the contract)
- Update `CLAUDE.md` auto-dispatch primitives section to document the slash-only contract and mark `dispatchAgent` marker queue as deprecated for production use
- Write a DEC entry superseding DEC-004's "future SLICE-D will ship the consumer" expectation — the consumer is no longer planned; slash flows are the contract

## Out of scope

- Building an actual marker-queue consumer (DEC-004 path); deferred indefinitely unless re-prioritized
- Changing existing slash command bodies (`commands/backlog-enrich.md`, etc.) — they already orchestrate inline via Claude tools
- Deleting `auto-dispatch.mts` or removing the marker file mechanism — kept as opt-in audit infrastructure for callers that want it

## Acceptance criteria

- [ ] AC-1: All tests pass (`npm test`) and linter is clean (`npm run lint`)
- [ ] AC-2: `/loop:backlog enrich` CLI subcommand exits with a clear refusal pointing at the slash command and does not call `dispatchAgent`
- [ ] AC-3: `/loop:backlog add` CLI subcommand no longer auto-dispatches `loop:researcher` (the call site is removed; existing `--no-research` flag stays for documentation but becomes a no-op or is removed)
- [ ] AC-4: `/loop:spec decompose` CLI subcommand no longer auto-dispatches `loop:architect` (call site removed; existing `--no-architect` flag handled the same as AC-3)
- [ ] AC-5: `/loop:slice complete` async doc-writer dispatch removed; doc-writer fires only via the slash flow when `--no-doc-writer` is absent
- [ ] AC-6: `CLAUDE.md` auto-dispatch primitives section updated — marker queue marked deprecated; slash-only contract documented
- [ ] AC-7: New DEC entry created at `docs/decisions/DEC-NNN.md` superseding DEC-004's consumer plan and citing this slice
- [ ] AC-8: Tests cover the refusal exit path for at least one CLI subcommand (e.g. `/loop:backlog enrich` returns non-zero with refusal message)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-049 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
