---
id: FEAT-049
status: pending
priority: P1
category: tech-debt
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
---
## Context

`src/scripts/lib/auto-dispatch.mts::dispatchAgent` writes a marker file to `.claude/artifacts/loop/pending-dispatch/\<timestamp\>-\<agent\>.json` and returns immediately with `output: "\<marker-written:...\>"`. No process consumes those markers — they accumulate.

Result: every CLI command that relies on `dispatchAgent` to invoke a Claude subagent silently no-ops. Callers parse the placeholder string as the agent's response, find no recognizable fields, and write nothing.

## Affected surfaces

- `/loop:backlog enrich` CLI subcommand — architect never classifies, FEAT tags never written
- `/loop:backlog add` CLI subcommand — researcher never enriches the body
- `/loop:spec decompose` CLI subcommand — architect never derives FEATs
- `/loop:slice complete` async dispatch — document-writer never runs

Slash commands (`commands/backlog-enrich.md` v0.8.5+, etc.) work around the gap by orchestrating Claude tools (Agent + Edit) directly in the session. CLI subcommands remain broken until consumer ships.

## Acceptance criteria

- [ ] Decision: build the marker consumer, or remove `dispatchAgent` from CLI paths and document slash-only orchestration as the contract
- [ ] If consumer: `dispatchAgent` actually invokes a Claude subagent synchronously (via shell to `claude` CLI binary, or another mechanism) and returns the real output, not a placeholder
- [ ] If removal: CLI subcommands that depended on dispatch either drop the dispatch path entirely OR fall back to a deterministic non-architect path with a warning
- [ ] `/loop:backlog enrich` CLI either works end-to-end (tags written) or refuses with a clear error pointing to the slash command
- [ ] Marker queue garbage collection: stale markers either consumed or pruned by a periodic task
- [ ] Tests cover both happy path and skip-flag path against the chosen design

## Prior art

GRADE-SLICE-23 DEC-004 logged this as a followup when the marker-queue design was first introduced. Slash-flow workaround shipped in v0.8.5 for /loop:backlog-enrich confirms the gap is real and the workaround is viable.