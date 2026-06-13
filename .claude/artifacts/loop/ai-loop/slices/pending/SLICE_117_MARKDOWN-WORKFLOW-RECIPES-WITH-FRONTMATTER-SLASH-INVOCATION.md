---
id: SLICE-117
title: Markdown Workflow recipes with frontmatter + slash invocation
status: pending
feature: FEAT-117
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 255
github_url: "https://github.com/sergeymilashico/loop/issues/255"
---
# SLICE-117: Markdown Workflow recipes with frontmatter + slash invocation

Implements FEAT-117. See [feature file](../../../backlog/in-progress/FEAT-117.md) for product context.

## Objective

Competitor gap audit (2026-05-28). Surfaced by:

## In scope

- Add `name` and `auto_execute_steps: false` frontmatter fields to all 44 `commands/*.md` files
- Export `validateCommandFrontmatter(repoRoot)` from `src/scripts/validate-manifests.mts`
- Wire validator into `validateManifests` function
- Create `src/tests/command-frontmatter.test.mts` with at least 5 test cases

## Out of scope

- Runtime wiring of `auto_execute_steps` to `autoMode` logic
- Nested workflow composition (`/command-name` calling another)

## Acceptance criteria

- [ ] AC-1: All tests pass (bun test) and linter is clean (bun run lint)
- [ ] AC-2: `bun ./src/scripts/validate-manifests.mts` exits 0 with "Manifests OK" after all 44 command files are updated with name + auto_execute_steps fields

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-117 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
