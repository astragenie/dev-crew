---
feature: FEAT-188
status: active
---
# Run Brief: FEAT188 SLICE102: Slice close command — merges complete + grade for autonomous_safe slices (FEAT-188)

- Created: 2026-06-12T10:10:56.085Z
- Tier: full
- Goal: Add `bun src/scripts/loop.mts slice close --id SLICE-NN [--grade-yaml <path>]` that collapses the 3-step closing ceremony (complete → grade → grade-write) into one CLI roundtrip when the FEAT is `autonomous_safe: true` and a pre-formatted grade file is supplied. Falls back to scaffold-only behavior otherwise. Existing 3-step subcommands remain.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - New lib `src/scripts/lib/slice-linker/close-slice.mts` exporting `closeSlice(repoPath
  - sliceId
  - opts)`.
- Re-export from `src/scripts/lib/slice-linker.mts`.
- CLI subcommand `close` in `src/scripts/loop.mts` (slice command registry).
- Tests `src/tests/close-slice.test.mts` (lib unit + CLI integration via spawnSync).
- Out Of Scope:
  - - Auto-extracting grade content from final-synthesis artifact body.
- Removing 3-step subcommands.
- Wiring crew:lead's slice closure step.
- Planned Files: -
- Next Step: Begin implementation

