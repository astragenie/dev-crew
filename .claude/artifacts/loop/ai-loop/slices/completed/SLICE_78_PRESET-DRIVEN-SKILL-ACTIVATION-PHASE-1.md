---
id: SLICE-78
status: completed
feature: FEAT-076
phase: 1
priority: P1
target_release: v0.27.0
requires_validation: false
created: 2026-06-07
updated: 2026-06-07
tags: [feature, workflow, "stack:node"]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
linkage:
  - .claude/artifacts/crew/runs/20260607T132159Z-final-synthesis-fe-be-routing-skills-mapping-crew-lead-decommission.md
  - docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md
  - docs/superpowers/plans/2026-06-07-preset-driven-skill-activation.md
---
# SLICE-78: Preset-driven skill activation — Phase 1

Implements FEAT-076. See [feature file](../../../backlog/done/FEAT-076.md) for product context.

## Objective

Ship the resolver primitive + preset schema v1 in `loop` plugin so per-FEAT `architect`-classification of stack identity can be retired. Multi-axis preset (`projectType`, `frontend`, `backend`, `contract`, `deployment`, `skills` / `fe.skills` / `be.skills`) becomes the sole source of builder skill loadout.

## In scope

- `src/scripts/lib/preset-schema.mts` — `PresetV1` interface + `validatePreset` (SchemaError on bad shape).
- `src/scripts/lib/deep-merge.mts` — override merger with `$replace` marker + concat-dedup.
- `src/scripts/lib/skill-resolver.mts` — `resolveSkills(args)` + `renderDispatchBlock`.
- `src/scripts/loop.mts` — new `resolve-skills` subcommand with `--variant`, `--preset`, `--override` flags. Exit codes 0/1/2.
- `scripts/presets/*.json` — all 6 shipped presets gain v1 fields.
- `.claude/loop.json` — extends with new axes (exercises override path).
- `src/scripts/validate-manifests.mts` — `validateAllPresets` hook in manifest validator.
- `src/scripts/lib/classify-parser.mts` — drop `stack:*` / `surface` emission.
- `commands/backlog-enrich.md` — remove `stack:` / `surface:` from architect prompt.
- CHANGELOG entry, CLAUDE.md update.

## Out of scope

- Phase 2 — `/crew:orchestrate-slice` integration (cross-plugin, separate slice).
- Phase 3 — deletion of static "Required skills" routing tables in `crew:builder*` agents.
- Role-skill activation for `pm`/`researcher`/`architect`/`document-writer` (deferred to FEAT-075 / SLICE-79).

## Acceptance criteria

- PASS: 13 tests in `skill-resolver`, 7 in `preset-schema`, 6 in `deep-merge`, 6 in `cli-resolve-skills`, all green.
- PASS: All 6 presets resolve correctly for their appropriate variants. CLI exit 2 on mismatch variants.
- PASS: 948 tests total at release; lint + format + manifest + content-length all green.
- PASS: `git diff --exit-code scripts/` clean (built `.mjs` in sync with `.mts` source).
- PASS: `classify-parser.test.mts` updated to assert `stack:` / `surface:` are NOT emitted.
- PASS: loop v0.27.0 tagged + pushed.

## Validation

`requires_validation: false` — pure infrastructure ship; validation is the test suite (948 tests pass on merged main). No runtime behavior changes for users until Phase 2 integration lands.

## Status note

Retroactive ceremony slice. Implementation already on `main` at v0.27.0 (commit `5f305be`). 10 underlying commits 9891905..2aa7c33 implementing the design.
