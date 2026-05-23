---
description: Report current loop install state for this repo — preset, paths, marker presence, crew dep.
---

# Autonomous Loop Status

Quick health check.

Workflow:

1. Run:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" status --repo "$PWD"
   ```
2. The output reports:
   - `preset` — active preset name
   - `aiLoopRoot`, `backlogPath`, `slicesRoot`, `phaseGateArtifactDir` — resolved paths
   - `hasMarkerBlock` — true if CLAUDE.md contains the loop marker block
   - `hasApprovedSlices`, `hasMasterPrompt` — scaffold presence
   - `crewCli` — path to the discovered crew CLI, or `null` if missing
3. If `hasMarkerBlock` is false or any path entry shows the scaffold missing,
   run `/loop:install`.
4. If `crewCli` is `null`, install the `crew` plugin first — phase-gate
   depends on it.
