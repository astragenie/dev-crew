---
id: FEAT-050
status: pending
priority: P1
category: feature
target_release: null
created: 2026-06-05
updated: 2026-06-05
depends_on: []
slices: []
derived_from: null
---
## Context

`/crew:orchestrate-slice` Step 1 currently dispatches `crew:architect` for every slice that has `needs_contract: true`, creating or extending `.claude/artifacts/crew/designs/<FEAT>-contracts.md`. That's one architect dispatch per slice, even though the contract artifact is usually FEAT-scoped, not slice-scoped.

User intent: contracts written if missing for a FEAT, lazily on first need. Two trigger paths:

1. **Slice start** — `/loop:slice-from-feature --id FEAT-NNN` (or `/loop:slice-start` when slice is the first for that FEAT) checks whether the contracts artifact exists; if not, dispatches `crew:architect` to populate it before any downstream specialist runs.
2. **Bulk pre-population** — `/loop:backlog-enrich` extends its sweep beyond classification tags. For every triaged FEAT whose contracts artifact is missing, dispatch `crew:architect` to write it. This lets an operator warm the cache for the whole backlog ahead of slice work, so first-slice latency stays low.

Either path is idempotent — already-present artifact is left untouched. Slice-revision flow (architect re-dispatch to add `## Revision — SLICE-NN` subsection) remains, but only when a slice's ACs genuinely introduce new public surface.

## Acceptance criteria

- [ ] **Slice-start trigger.** When `/loop:slice-from-feature --id FEAT-NNN` runs for a slice (any slice, not just SLICE-1) whose parent FEAT has `needs_contract: true`, the command checks `.claude/artifacts/crew/designs/FEAT-NNN-contracts.md`. If absent, dispatch `crew:architect` inline (Claude-driven, same pattern as `/loop:backlog-enrich` slash body) with FEAT body + tags + acceptance criteria and write the four-section artifact (TypeScript Interfaces / API Contracts / Event Schemas / Data Contracts).
- [ ] **Backlog-enrich extension.** `/loop:backlog-enrich` slash body gains a second sweep after classification: for every triaged FEAT with `needs_contract: true` and missing contracts artifact, dispatch `crew:architect` and write the artifact. Order: classify first (so `needs_contract` is set), then contracts (so we only dispatch architect for FEATs that actually need it). Skip FEATs where `needs_contract: false`.
- [ ] **Orchestrate-slice no-op.** `/crew:orchestrate-slice` Step 1 detects existing contracts artifact and skips architect dispatch when the slice does not require a revision. Revision heuristic: slice frontmatter `revises_contract: true` OR slice AC text contains "new endpoint", "new event", "new schema", "breaking change".
- [ ] **Revision path preserved.** When revision needed, architect is dispatched with an instruction to read the existing artifact and append a `## Revision — SLICE-NN` subsection only — never overwrite prior sections.
- [ ] **Idempotence.** Both triggers safe to re-run; existing artifacts left untouched.
- [ ] **Tests.** Simulate three flows: (a) two slices on same FEAT, architect runs once at slice 1 only; (b) `/loop:backlog-enrich` against 3 triaged FEATs missing contracts, all 3 artifacts written in one sweep; (c) slice with `revises_contract: true`, architect runs and appends revision subsection without losing prior content.
- [ ] **Failure mode.** When architect dispatch fails (timeout, parse error, empty response), surface a warning + the slice/sweep continues without the artifact (orchestrate-slice will retry on next slice start). No silent corruption of partial artifact.

## Design notes

- Both triggers MUST use the inline Claude-tool orchestration pattern (Agent + Edit), not the `dispatchAgent` marker queue — see FEAT-049 for that gap. Slash command body documents the orchestration steps; CLI subcommands either delegate or refuse.
- Artifact path canonical: `.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md`. Resolved from FEAT-ID alone — no SLICE-ID in the filename so multiple slices share one artifact.
- Architect prompt template lives in `commands/backlog-enrich.md` and `commands/slice-from-feature.md` (or wherever slice-start logic lives). Single source of truth for the prompt; deduplication is fine across commands as long as the four-section output contract matches.

## Related

- DEC-010 (existing) — orchestrate-slice version gate
- FEAT-048 — architect classification tags (provides `needs_contract` field this FEAT consumes)
- FEAT-049 — auto-dispatch marker queue has no consumer (forces inline dispatch pattern)
- FEAT-051 — parallel uxdesigner + builder in /crew:orchestrate-slice (depends on this FEAT — without pre-existing contracts, architect blocks both branches)
