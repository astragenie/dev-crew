---
id: SLICE-05
title: .ts->.mts rename sweep batch 1 (dev-team src)
status: pending
feature: FEAT-002
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-08-18
updated: 2026-08-18
effort_points: 2
proposed_slice_id_suffix: -SLICE-2
estimated_tokens: 100000
tags: ["stack:typescript"]
---
# SLICE-05: .ts->.mts rename sweep batch 1 (dev-team src)

Implements FEAT-002. See [feature file](../../../backlog/in-progress/FEAT-002.md) for product context.

## Objective



## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

> WARNING: ACs copied from FEAT-002 and shared across 7 sibling slices — scope per-slice before close

- [ ] AC-1: Given the dev-team + runner-plugin subtrees are imported into dev-crew and the .ts->.mts + node:test->bun:test migration is complete, When `grep -rl 'from "node:test"' src/ | wc -l` runs on the merged tree, Then the count is 0.
- [ ] AC-2: Given the Wiggin-branding scrub ran at import, When `grep -rli wiggin --exclude-dir=node_modules --exclude-dir=.git .` runs excluding any explicitly archived-parent directory, Then the count is 0.
- [ ] AC-3: Given the merged suite claims green, When `bun test --timeout 60000 --parallel` runs 20 consecutive times, Then all 20 runs report 0 failures -- a single failing run among the 20 invalidates this exit gate and P1 does not close (this directly targets the unresolved 2/2111 failure the plan's own live experiment surfaced).
- [ ] AC-4: Given the rename sweep and tsconfig consolidation are complete, When `bunx tsc --project tsconfig.json --noEmit && bunx tsc --project tsconfig.test.json --noEmit` runs, Then both invocations exit 0.
- [ ] AC-5: Given P0 has not yet produced its baseline tags, When P1's subtree-import step is attempted, Then it refuses to start (no `git subtree add` executed) until `git tag --list "pre-devcrew-baseline*"` returns a match in both parent repos.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-002 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
