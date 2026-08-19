---
feature: FEAT-020
---
# Run Brief: FEAT020 SLICE37: Implement FEAT-020

- Created: 2026-08-19T21:16:47.574Z
- Tier: full
- Goal: CLI arg-parse hardening: loop.mts install (and likely sibling subcommands) silently ignores unknown flags — 'install --help' fell through and executed a REAL install against cwd, rewriting the current repo's CLAUDE.md (observed live during SLICE-31, reverted). Unknown flags must hard-fail with usage text before any side effect; add --help support to every subcommand; regression test: 'install --help' and 'install --bogus-flag' both exit non-zero (or print usage) with ZERO file writes.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - bullet 1
- bullet 2
- Out Of Scope:
  - - bullet 1
- Planned Files: -
- Next Step: Begin implementation

