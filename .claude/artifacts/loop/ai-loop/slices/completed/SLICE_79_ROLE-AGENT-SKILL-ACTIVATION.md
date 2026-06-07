---
id: SLICE-79
status: completed
feature: FEAT-075
phase: 1
priority: P2
target_release: v0.28.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [feature, workflow, "stack:node"]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
linkage:
  - .claude/artifacts/loop/backlog/done/FEAT-075.md
---
# SLICE-79: Role-agent skill activation (FEAT-075)

Implements FEAT-075. See [feature file](../../../backlog/done/FEAT-075.md) for product context.

## Objective

Extend the Phase-1 preset-driven skill activation pattern to loop-owned role agents (`pm`, `researcher`, `architect`, `document-writer`). Phase 1 covered builder loadouts only (`fe.skills`, `be.skills`, `skills`). Role agents had static routing tables in their own prompts — drift risk vs builder side.

## In scope

- `src/scripts/lib/preset-schema.mts` — add optional `roles.{pm,researcher,architect,document-writer}.skills` block with validator.
- `src/scripts/lib/skill-resolver.mts` — accept role variants in `Variant` union; `pickBlock` handles `preset.roles.<name>`. New `source` literal `preset.roles.pm | preset.roles.researcher | ...`.
- `src/scripts/loop.mts` — extend CLI `--variant` validation to accept role names.
- `scripts/presets/*.json` — all 6 shipped presets gain a default `roles` block (`superpowers:verification-before-completion`, `loop:loop-discipline`, `superpowers:brainstorming`).
- `commands/backlog-enrich.md` — wire architect dispatch to call resolver and prepend block.
- CHANGELOG entry.

## Out of scope

- Wiring `loop:pm` / `loop:researcher` / `loop:document-writer` dispatchers in their slash flows (deferred to follow-up slice).
- Removing static "Required skills" tables from `agents/*.md` (Phase 3, after one release cycle).
- Cross-plugin role agents (`crew:*`) — owned upstream.

## Acceptance criteria

- PASS: 4 new tests for `validateRoles` (split + roles + reject unknown role + reject bad block).
- PASS: 6 new tests for role variants in `skill-resolver` (pm/architect/document-writer source labels + override append + missing role returns null).
- PASS: CLI accepts `--variant pm|researcher|architect|document-writer`; exit 0 on resolved, 2 on missing role block.
- PASS: All 6 shipped presets emit `preset.roles.architect` block when queried (CLI smoke).
- PASS: `/loop:backlog-enrich` command body documents the resolver call between filter + dispatch.
- PASS: 958 tests at release.
- PASS: loop v0.28.0 tagged + pushed.

## Validation

`requires_validation: false` — same rationale as SLICE-78. Test suite is the validation; no externally observable behavior change until consumer (slash flows) calls the resolver.

## Status note

Retroactive ceremony slice. Implementation already on `main` at v0.28.0 (commit `7d4bd62`).
