---
id: SLICE-117
title: SessionStart hook that injects bootstrap context before any user turn
status: pending
feature: FEAT-100
phase: null
priority: P2
target_release: null
requires_validation: true
created: 2026-06-13
updated: 2026-06-13
github_issue: 253
github_url: "https://github.com/sergeymilashico/loop/issues/253"
---
# SLICE-117: SessionStart hook that injects bootstrap context before any user turn

Implements FEAT-100. See [feature file](../../../backlog/in-progress/FEAT-100.md) for product context.

## Objective

Add a SessionStart hook that injects a compact loop bootstrap-context summary into every Claude Code session where the loop plugin is installed. Ensures key HARD RULE reminders survive context compaction in long marathonMode sessions.

## In scope

- Create `hooks/bootstrap-context.mjs` — static bootstrap summary printed to stdout
- Add second entry to `.claude-plugin/hooks/hooks.json` SessionStart array
- Add `src/tests/bootstrap-context.test.mts` with 5 test cases

## Out of scope

- Modifying `hooks/version-check.mjs`
- Changing other hook types (PreToolUse, etc.)
- Dynamic file reads at hook runtime

## Acceptance criteria

- [ ] AC-1: `node --check hooks/bootstrap-context.mjs` exits 0 (syntax valid)
- [ ] AC-2: SessionStart array in `.claude-plugin/hooks/hooks.json` has 2 entries; second entry command contains "bootstrap-context.mjs", description is "loop:bootstrap-context", timeout is 5
- [ ] AC-3: `node hooks/bootstrap-context.mjs` exits 0, stdout contains "loop bootstrap context", line count <= 65
- [ ] AC-4: Hook output contains all six HARD RULE topics: "Run until PASS", "autoMode", "slice start", "crew:builder", "escalated_to_human", "rules.md"
- [ ] AC-5: `hooks/bootstrap-context.mjs` has no import, require, readFile, existsSync, spawnSync, or fetch calls (no runtime dependencies)
- [ ] AC-6: SessionStart[0].hooks[0].command still equals `node "${CLAUDE_PLUGIN_ROOT}/hooks/version-check.mjs"` (existing hook unmodified)
- [ ] AC-7: `bun src/tests/bootstrap-context.test.mts` exits 0, all 5 tests pass
- [ ] AC-8: `bun run test` exits 0, all existing tests pass

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-100 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
