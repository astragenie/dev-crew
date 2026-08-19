---
id: SLICE-37
title: Implement FEAT-020
status: completed
feature: FEAT-020
phase: null
priority: P0
target_release: null
requires_validation: true
risk: high
created: 2026-08-19
updated: 2026-08-19
completed_at: 2026-08-19
badges: [serial-reviewer-warning]
---
# SLICE-37: Implement FEAT-020

Implements FEAT-020. See [feature file](../../../backlog/in-progress/FEAT-020.md) for product context.

## Objective

CLI arg-parse hardening: loop.mts install (and likely sibling subcommands) silently ignores unknown flags — 'install --help' fell through and executed a REAL install against cwd, rewriting the current repo's CLAUDE.md (observed live during SLICE-31, reverted). Unknown flags must hard-fail with usage text before any side effect; add --help support to every subcommand; regression test: 'install --help' and 'install --bogus-flag' both exit non-zero (or print usage) with ZERO file writes.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given `bun src/scripts/loop.mts install --help` invoked against any repo, When parseArgs resolves flags.help === true for the install subcommand, Then the install handler prints usage text and returns before touching the filesystem -- zero writes to CLAUDE.md, .claude/loop.json, or any other file.
- [x] AC-2: Given `bun src/scripts/loop.mts install --bogus-flag`, When the command runs, Then it exits non-zero (or prints usage) with zero file writes, whether the failure comes from parseArgs's existing 'Unknown argument' throw or a new subcommand-level flag validator.
- [x] AC-3: Given every subcommand dispatched from loop.mts's command switch (not just install), When --help or -h is passed as an argument after the subcommand name, Then that subcommand's handler checks flags.help before any side-effecting operation and prints usage instead of executing.
- [x] AC-4: Given a regression test asserting on 'install --help' and 'install --bogus-flag', When the test suite runs (bun test src/tests/ --parallel), Then both invocations are asserted to produce zero file writes against a temp/fixture repo (not this repo's own working tree) and a non-zero exit or usage-print, closing the exact SLICE-31 near-miss.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-020 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
