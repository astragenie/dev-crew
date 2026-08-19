---
id: FEAT-020
status: done
priority: P0
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-37]
derived_from: null
pm_customer_impact: 0.85
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.55
pm_technical_risk: 0.25
pm_dependency_depth: 0.15
pm_composite_priority: P0
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Confirmed live near-miss data-loss defect, source-verified rather than taken on faith: parseArgs already sets flags.help correctly, but install's dispatch path never checks it, and this executed a real install against cwd tonight during SLICE-31 (caught and reverted). Treated as bugfix-class for the P0 branch given customer_impact=0.85 -- severity comes from blast radius (any operator running --help expecting a no-op) over code-change danger, the same framing applied to FEAT-010 in the prior review. The fix itself is a bounded, low-risk guard-clause pattern repeated across a known, small set of subcommand handlers, keeping autonomous_safe true."
started_at: 2026-08-19
slices_complete: [SLICE-37]
completed_at: 2026-08-19
---
## Description

CLI arg-parse hardening: loop.mts install (and likely sibling subcommands) silently ignores unknown flags — 'install --help' fell through and executed a REAL install against cwd, rewriting the current repo's CLAUDE.md (observed live during SLICE-31, reverted). Unknown flags must hard-fail with usage text before any side effect; add --help support to every subcommand; regression test: 'install --help' and 'install --bogus-flag' both exit non-zero (or print usage) with ZERO file writes.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given `bun src/scripts/loop.mts install --help` invoked against any repo, When parseArgs resolves flags.help === true for the install subcommand, Then the install handler prints usage text and returns before touching the filesystem -- zero writes to CLAUDE.md, .claude/loop.json, or any other file.
- AC-2: Given `bun src/scripts/loop.mts install --bogus-flag`, When the command runs, Then it exits non-zero (or prints usage) with zero file writes, whether the failure comes from parseArgs's existing 'Unknown argument' throw or a new subcommand-level flag validator.
- AC-3: Given every subcommand dispatched from loop.mts's command switch (not just install), When --help or -h is passed as an argument after the subcommand name, Then that subcommand's handler checks flags.help before any side-effecting operation and prints usage instead of executing.
- AC-4: Given a regression test asserting on 'install --help' and 'install --bogus-flag', When the test suite runs (bun test src/tests/ --parallel), Then both invocations are asserted to produce zero file writes against a temp/fixture repo (not this repo's own working tree) and a non-zero exit or usage-print, closing the exact SLICE-31 near-miss.
