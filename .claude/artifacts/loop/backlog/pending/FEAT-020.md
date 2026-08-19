---
id: FEAT-020
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
---
## Description

CLI arg-parse hardening: loop.mts install (and likely sibling subcommands) silently ignores unknown flags — 'install --help' fell through and executed a REAL install against cwd, rewriting the current repo's CLAUDE.md (observed live during SLICE-31, reverted). Unknown flags must hard-fail with usage text before any side effect; add --help support to every subcommand; regression test: 'install --help' and 'install --bogus-flag' both exit non-zero (or print usage) with ZERO file writes.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.