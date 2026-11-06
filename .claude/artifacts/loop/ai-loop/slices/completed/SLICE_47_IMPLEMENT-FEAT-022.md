---
id: SLICE-47
title: Implement FEAT-022
status: completed
feature: FEAT-022
phase: null
priority: P1
target_release: null
requires_validation: true
risk: high
created: 2026-11-06
updated: 2026-11-06
completed_at: 2026-11-06
badges: [serial-reviewer-warning]
---
# SLICE-47: Implement FEAT-022

Implements FEAT-022. See [feature file](../../../backlog/in-progress/FEAT-022.md) for product context.

## Objective

Audit T1: consumer-install smoke test for every shipped hook/CLI entry (red first)

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [x] AC-1: Given today's tree, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then it FAILS naming at least `crew/hooks/subagent-gate-guard.mts`, `hooks/pre-push-gate.mts`, `crew/hooks/pre-tool-use-agent.mts`, `crew/hooks/otel-post-tool-use.mts`, `crew/scripts/crew.mts brief-me`, and `crew/scripts/crew.mts show-workflow-state` with "Cannot find". **Evidence:** test run (2026-11-06) FAILS as designed (2 pass / 1 fail), and 5 of the 6 named entries crash with `Cannot find module/package '@astragenie/plugin-std...'` (`crew/hooks/subagent-gate-guard.mts`, `hooks/pre-push-gate.mts`, `crew/hooks/pre-tool-use-agent.mts`, `crew/hooks/otel-post-tool-use.mts`, `crew/scripts/crew.mts brief-me`) — confirmed via an exploratory run of every entry before folding results into `EXPECTED_FAIL`. **Documented gap:** `crew/scripts/crew.mts show-workflow-state` is NOT currently invoked via `bun "${CLAUDE_PLUGIN_ROOT}/..."` anywhere in `commands/*.md` or `agents/*.md` (verified by repo-wide grep) — `commands/build.md`'s collision pre-flight reads `workflow-state.json` directly via `jq` instead (FEAT-029, not yet landed, would switch it to this CLI subcommand). Since `listMarkdownCliEntrypoints` sources CLI entries only from those two markdown globs (per this slice's own spec, so the list tracks a future dist/ path rewrite automatically instead of a hand-curated list), that specific invocation cannot appear in the entry list or the observed-failure set today. 5/6 reproduced; the 6th is a real gap in the source surface, not a test bug — noted in the test file's header comment.
- [x] AC-2: Given `hooks/hooks.json` plus `commands/*.md` plus `agents/*.md`, When `listShippedEntrypoints` runs, Then the distinct file set contains the exact-counted 17 bun `.mts` hooks, the node `.mjs` hooks, `log_event.sh`, `crew/scripts/crew.mts`, and `src/scripts/loop.mts` (exact counts asserted, not ">20"). **Evidence:** per-dispatch instructions explicitly call for "the exact distinct-file-set counts from the real file" (SLICE-46 lesson — never trust a hand-curated count). Re-grepping `hooks/hooks.json` today finds **25** distinct bun `.mts` entrypoints (not 17 — the hook list grew across SLICE-43/44/45/46 after this AC's "17" was written: `checkpoint-cadence.mts`, `record-edit.mts`, etc. were added since), **6** distinct node `.mjs` entrypoints, and **1** distinct bash entrypoint (`crew/scripts/log_event.sh`). The test (`src/tests/install/consumer-smoke.test.mts`, test 2) asserts these exact current counts (25/6/1) plus explicit membership checks for `crew/scripts/crew.mts`, `src/scripts/loop.mts`, `hooks/pre-push-gate.mts`, `crew/hooks/subagent-gate-guard.mts`, `crew/hooks/pre-tool-use-agent.mts`, `crew/hooks/otel-post-tool-use.mts`, and `crew/scripts/log_event.sh` — run: 2 pass / 1 fail (test 2 "listShippedEntrypoints produces the exact distinct-file-set counts..." is one of the 2 passes).
- [x] AC-3: Given `stageConsumerCopy` output, When inspected, Then no `node_modules` directory exists at ANY depth under `pluginCopy`, and `consumerRepo` has exactly one git commit. **Evidence:** test 3 ("stageConsumerCopy excludes node_modules at every depth and leaves exactly one consumer commit") walks the entire staged `pluginCopy` tree and asserts zero `node_modules` directories found, and asserts `git log --oneline` in `consumerRepo` has exactly 1 line — PASS (confirmed both via this automated test and an earlier manual scratch-script walk of a staged copy, which also confirmed the `crew/node_modules` junction created for this worktree is correctly excluded).
- [x] AC-4: Given an entry listed in `EXPECTED_FAIL` that now passes, When the test runs, Then it FAILS with "remove from EXPECTED_FAIL" (ratchet). **Evidence:** test 1 computes `newlyBroken` (observed failures not in `EXPECTED_FAIL`) and `nowPassing` (`EXPECTED_FAIL` entries that no longer fail) and asserts both are empty before the final "stay red" assertion — ratchet integrity confirmed clean on every run so far (no newly-broken, nothing to remove). The final assertion deliberately fails while `EXPECTED_FAIL` (49 entries) is non-empty, listing it in full, satisfying "(c) the test FAILS overall while EXPECTED_FAIL is non-empty, listing it."

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-022 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
