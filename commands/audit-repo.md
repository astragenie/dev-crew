---
name: audit-repo
description: Internal setup/debug command to inspect whether the Crew harness is already present.
auto_execute_steps: false
---

# Audit Repo For Crew

Use this workflow before adopting when you want to understand the current repo state.

Workflow:

1. Run the installer audit command:
   - `node "${CLAUDE_PLUGIN_ROOT}/scripts/crew.ts" audit --repo "$PWD"`
2. Report whether the repo already has:
   - `CLAUDE.md`
   - `.claude/`
   - `.claude/settings.json`
   - `.claude/artifacts/crew/`
   - `.claude/state/crew/`
   - global Crew memory in `~/.claude/crew/`
3. If the harness is incomplete, recommend either:
   - `/devcrew:adopt` for adoption into this repo
   - `/devcrew:init` for a fresh repo instead

Deliverable:

- a short state report
- the recommended next step
