---
id: SLICE-17
status: completed
feature: FEAT-005
phase: null
priority: P2
target_release: null
requires_validation: false
created: 2026-06-03
updated: 2026-06-03
completed_at: 2026-06-03
---
# SLICE-17: FEAT-005 — Architect / editor two-model split command

## Objective

Add `loop architect --id SLICE-NN` CLI command that runs the codebase
research pre-flight using the architect model (Opus) and returns an
explicit two-model dispatch instruction naming both architect and editor
models. Closes the Aider competitor gap.

## Deliverables

1. `src/scripts/lib/model-router.mts` — `"architect"` added to MODEL_PHASES; `resolveArchitectModels(config)` added
2. `src/scripts/loop.mts` — `runArchitectSubcommand` + registered as `architect` in COMMANDS
3. `commands/architect.md` — command skill documentation
4. `src/tests/model-router.test.mts` — 5 tests covering MODEL_PHASES, resolveArchitectModels paths

## Acceptance criteria

- [x] AC1: `loop architect --id SLICE-NN` returns `{ sliceId, architectModel, editorModel, planPath, filesResearched, dispatchInstruction }` — PASS
- [x] AC2: Missing `--id` throws clear error — PASS
- [x] AC3: `resolveArchitectModels` with standard config → architect=opus, editor=sonnet — PASS
- [x] AC4: MODEL_PHASES includes "architect" — PASS
- [x] AC5: Telemetry logged via logEvent — PASS
- [x] AC6: 530 tests pass, lint clean — PASS

## Evidence

- `npm test`: 530/530 pass (baseline 525, +5 new)
- `npm run lint`: clean
- Review: APPROVED (format:check failure pre-existing at HEAD, 32 files, not our regression)
- `requires_validation: false` — CLI + library, test suite covers all paths
