---
status: active
---
# Run Brief: FEAT244 SLICE149: Real headless spawn wiring + permission allowlist (B3 AC-3)

- Created: 2026-07-10T00:50:04.856Z
- Tier: full
- Goal: Replace the `spawnReaction` console.log stub in `sweep.mts` (deferred from SLICE-146 pending this allowlist) with real detached child-process spawning of headless `claude -p` reaction sessions, gated by a pre-configured permission allowlist. Constructed spawn args MUST include the configured allowlist (`--allowedTools` and/or settings-based permissions) and MUST NEVER include `--dangerously-skip-permissions`. Also close the SLICE-145 reviewer INFO: tighten `recordReactionStart` vs spawn ordering
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New `src/scripts/lib/watch/reaction-spawn.mts`: builds spawn args (claude binary
  - -p command
  - cwd
  - allowlist flags from machine config) and spawns detached; arg-construction pure function exported for tests
- Out Of Scope: -
- Planned Files: -
- Next Step: Begin implementation

