---
id: SLICE-34
title: Implement FEAT-013
status: completed
feature: FEAT-013
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-34: Implement FEAT-013

Implements FEAT-013. See [feature file](../../../backlog/in-progress/FEAT-013.md) for product context.

## Objective

crew/ flatten phase 1 — boundary validator + hooks.json path map: add a root validator enforcing the root<->crew/ import boundary (today only convention + CI path strings guard it; the single sanctioned cross-import is hooks/pre-push-gate.mts -> 4 crew modules, allowlist it), and produce a machine-readable inventory of every ${CLAUDE_PLUGIN_ROOT}/crew/... path in .claude-plugin/hooks/hooks.json as the prerequisite map for the later hooks relocation.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a source file outside crew/ that attempts to import a crew/-internal module not on the allowlist, When the root validator runs in CI, Then it fails with the offending file:line and the disallowed import path named.
- [ ] AC-2: Given hooks/pre-push-gate.mts importing from 4 crew modules, When the validator runs, Then those specific imports pass because they are on the sanctioned allowlist, and no other cross-import is silently permitted.
- [ ] AC-3: Given .claude-plugin/hooks/hooks.json, When the inventory scan runs, Then it produces a machine-readable list of every ${CLAUDE_PLUGIN_ROOT}/crew/... path referenced in that file, keyed by hook name.
- [ ] AC-4: Given the new validator is added to CI, When an existing, currently-passing build runs against it, Then it passes cleanly (no false-positive on any currently-sanctioned import pattern).

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-013 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
