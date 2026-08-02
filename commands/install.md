---
name: install
description: Install or refresh the loop methodology layer in this repo (HARD RULE blocks, loop-control docs, backlog scaffold, .claude/loop.json).
auto_execute_steps: false
---

# Install Autonomous Loop

Adds the Wiggin Loop methodology to the current repo:

- Replaces or appends the `<!-- runner:start -->` marker block in `CLAUDE.md` with the three HARD RULE blocks (Autonomous Loop, Cross-Slice Continuation, Phase Completion Gate) plus the First Action section.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`: `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`. **Always overwritten** — user customization lives in `.claude/loop.json`, not in these files.
- Writes `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md` (always overwritten).
- Creates backlog scaffolds at `<backlogPath>/{approved,completed,product-backlog}.md` and `<slicesRoot>/pending/.gitkeep` — **only if missing**, never clobbered.
- Writes `.claude/loop.json` from the chosen preset — **only if missing**. This is a one-time scaffold: the preset's full content (`loop.*`, `stack.*`, `reviewers`, `mandatoryDocs`, `productName`/`productDescription`, `stackDescription`, `skills`/`fe`/`be`, `roles.*`) is inlined directly. After install, nothing at runtime reads `scripts/presets/*.json` again — `.claude/loop.json` is the sole source of truth (FEAT-218 Phase 2 / DEC-069).
- `--light` (FEAT-271): trims the reviewer ladder to a single reviewer plus CI-delegated validation — seeds `reviewers.ladder: ["A"]` and `loop.validation.satisfiedByReview: true` instead of the default two-reviewer ladder. **Only trim the ladder on a repo with a CI test gate** — see the ADOPTION.md rollout guidance for when to keep the full `["A", "B"]` ladder. Omitting `--light` is fully backward compatible: behavior is unchanged from before this flag existed. Two cases:
  - **Fresh install** (no `.claude/loop.json` yet, `--preset` required): the preset's opt-in `light` block is merged into the config before the one-time scaffold write.
  - **Already-installed repo** (this is the common fleet-retrofit case — most of the fleet installed before this flag existed): `--preset` is not needed. The installer reads the existing `.claude/loop.json` directly and rewrites *only* `reviewers` and `loop.validation` in place — every other key (including hand-edited `productName`, `stack` overrides, etc.) is left byte-stable. It sources the trimmed-ladder values from the repo's own persisted `preset` name when resolvable, falling back to the fixed values above otherwise (identical across every shipped preset). Re-running `--light` against an already-trimmed repo is a no-op.

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
   bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" install --repo "$PWD" --preset dotnet-python
   ```
   `--preset` is **required** for a first-time install (no `.claude/loop.json` on disk yet) — there is no hardcoded default stack. Omit `--preset` only to re-install/refresh an already-configured repo; the installer then reads the existing `.claude/loop.json` as-is (no re-merge). Add `--light` to seed the trimmed single-reviewer ladder instead of the default two-reviewer ladder (only on a repo with a CI test gate).
4. Report which files were written and which preset is active.
5. Suggest the user populate `.claude/loop.json` `productName`, `productDescription`, and `stack` overrides before running `/runner:phase-gate` for the first time.

After install:

- `/runner:status` — show resolved config + marker presence
- `/runner:phase-gate --phase <N>` — run the configured suite
- `/runner:list-presets` — see built-in presets
