---
feature: FEAT-100
status: active
---
# Run Brief: FEAT100 SLICE117: SessionStart hook that injects bootstrap context before any user turn

- Created: 2026-06-13T10:57:48.469Z
- Tier: full
- Goal: Add a SessionStart hook that injects a compact loop bootstrap-context summary into every Claude Code session where the loop plugin is installed. Ensures key HARD RULE reminders survive context compaction in long marathonMode sessions.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - Create `hooks/bootstrap-context.mjs` — static bootstrap summary printed to stdout
- Add second entry to `.claude-plugin/hooks/hooks.json` SessionStart array
- Add `src/tests/bootstrap-context.test.mts` with 5 test cases
- Out Of Scope:
  - - Modifying `hooks/version-check.mjs`
- Changing other hook types (PreToolUse
  - etc.)
- Dynamic file reads at hook runtime
- Planned Files: -
- Next Step: Begin implementation

