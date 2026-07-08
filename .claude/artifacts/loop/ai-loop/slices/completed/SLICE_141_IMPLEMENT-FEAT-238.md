---
id: SLICE-141
title: Implement FEAT-238
status: completed
feature: FEAT-238
phase: null
priority: P1
target_release: null
requires_validation: false
risk: medium
created: 2026-07-08
updated: 2026-07-08
github_issue: 385
github_url: "https://github.com/astragenie/runner-plugin/issues/385"
completed_at: 2026-07-08
---
# SLICE-141: Implement FEAT-238

Implements FEAT-238. See [feature file](../../../backlog/in-progress/FEAT-238.md) for product context.

## Objective

`src/scripts/lib/memory-context.mts:35` uses a **top-level static** import:

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given a repo with `loop.memory.enabled = "never"` (or the astramem-client package absent from the plugin cache), When `slice start` runs, Then it completes without ENOENT — memory recall is skipped, not crashed. Evidence: import moved inside memory-enabled `safe()` block (memory-context.mts), PR #383.
- [x] AC-2: Given `memory.enabled` is on/auto and the package IS resolvable, When memory context is built, Then recall works exactly as today (no behavior regression). Evidence: memory-context.test.mts recallSilent-fold tests still pass, full suite green in #383.
- [x] AC-3: The `@astragenie/astramem-client` import in `memory-context.mts` is converted to a `memory.enabled`-gated dynamic `await import(...)`, matching the pattern in `grade-writer.mts`/`learnings.mts`; a test simulates the unresolvable/`never` case and asserts no throw. Evidence: "disabled memory never touches astramem recall" test, memory-context.test.mts.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-238 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
