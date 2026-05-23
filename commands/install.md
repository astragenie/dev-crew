---
description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
---

# Install Autonomous Loop

Adds the Wiggin Loop methodology to the current repo:

- Replaces or appends the `<!-- loop:start -->` marker block in `CLAUDE.md` with the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) plus the First Action section.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
- Writes `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md` (always overwritten).
- Creates backlog scaffolds at `<backlogPath>/{approved,completed,product-backlog}.md` and `<slicesRoot>/pending/.gitkeep` — **only if missing**, never clobbered.
- Writes `.claude/loop.json` from the chosen preset — **only if missing**.

If the repo currently has an ad-hoc HARD RULE block hand-pasted into CLAUDE.md (the pattern from WigginHarnes / MemoryService / AstraGenie.Tools), the installer migrates it: extracts the phase-gate commands into the config, deletes the ad-hoc block, writes the new marker-bracketed block in its place.

**Hard dependency:** the `crew` plugin must be installed in the Claude Code plugin cache. The installer errors with a clear message if it cannot find `crew`.

Workflow:

1. Verify the workspace:
   - `pwd`
2. Optionally back up `.claude/` per the adoption checklist in the hero-crew docs:
   ```bash
   cp -r .claude ".claude.backup.$(date -u +%Y%m%dT%H%M%SZ)"
   ```
3. Run the installer:
   ```bash
   set -euo pipefail
   node "${CLAUDE_PLUGIN_ROOT}/scripts/loop.mjs" install --repo "$PWD" --preset dotnet-aspire-python
   ```
   Omit `--preset` to use whatever preset is already recorded in `.claude/loop.json`, or the default if no config exists yet.
4. Report which files were written and which preset is active.
5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/loop:phase-gate` for the first time.

After install:

- `/loop:status` — show resolved config + marker presence
- `/loop:phase-gate --phase <N>` — run the configured suite
- `/loop:list-presets` — see built-in presets
