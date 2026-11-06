---
id: FEAT-022
status: done
priority: P1
category: feature
target_release: null
created: 2026-11-05
updated: 2026-11-06
depends_on: [FEAT-033]
slices: [SLICE-47]
derived_from: null
pm_customer_impact: 0.9
pm_effort_estimate: 0.3
pm_strategic_alignment: 0.9
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-11-05
autonomous_safe: true
triage_notes: "P1, holds. technical_risk 0.3 (band 0.3-0.5 low end — still mechanical test-infra, no schema change). dependency_depth bumped slightly to 0.1 to reflect the new explicit depends_on: [FEAT-033] (the file this test enumerates must sit at the real discoverable path first, or the entry list itself is built on the wrong file)."
started_at: 2026-11-06
slices_complete: [SLICE-47]
completed_at: 2026-11-06
---
## Description

Audit T1: consumer-install smoke test for every shipped hook/CLI entry (red first)

Source: docs/superpowers/plans/2026-11-05-devcrew-audit-remediation.md Task 1; audit #41; docs/audits/2026-11-05/smoke-baseline.md. Wave 1 lane A. Depends on: FEAT-033 (hooks file at the discoverable path, so the entry list reads the real file).

Problem: the marketplace cache installs only the plugin-root package.json deps (docs: loading.md), and devcrew is ineligible anyway (root bun.lock declares workspaces; crew/ carries a git dependency), so consumers get no node_modules for crew/. Every crew/ entry importing @astragenie/plugin-std, zod, yaml crashes. Nothing in CI catches this. The 2026-11-05 baseline invoked hooks by hand with bun; it never tested discovery (FEAT-033) nor the slash-command surface.

Deliverable (test is RED on today's tree; it is the permanent consumer-install gate):
- src/scripts/lib/install/shipped-entrypoints.mts: `listShippedEntrypoints(pluginRoot)` parses (a) every command in hooks/hooks.json → {kind:"hook", runtime: bun|node|bash, file, args, stdinFixture}, with runtime "bash" for the six `crew/scripts/log_event.sh` entries (no runtime word), and (b) every `bun "${CLAUDE_PLUGIN_ROOT}/<path>" <args>` string in commands/*.md and agents/*.md → {kind:"cli"} (distinct by path+first arg), so the list tracks the later dist/ path rewrite automatically. Returns the distinct file set.
- `stageConsumerCopy(pluginRoot)`: copies the tree excluding `.git`, `.worktrees`, and `node_modules` AT ANY DEPTH (crew/node_modules exists locally, 272 MB, and would make the crew entries pass), then `git init` + one commit in a sibling temp consumer repo. The staged copy must mimic the real cache: no node_modules anywhere.
- src/tests/install/consumer-smoke.test.mts: runs each entry from the consumer repo with CLAUDE_PLUGIN_ROOT=pluginCopy, CLAUDE_PROJECT_DIR=consumerRepo: `bun --no-install` for bun, `node` for .mjs, `bash` for .sh when bash is on PATH (else the failure message says "skipped: no bash"). Fails on rc!=0 or /Cannot find (package|module)/. Carries an `EXPECTED_FAIL` set (initially the six known-crashing files) so the assertion reports "still broken" vs "newly broken"; FEAT-026 clears the hook entries, the wave-2.5 path rewrite clears the CLI entries.
- Fixtures: src/tests/install/fixtures/{pretooluse-bash,subagentstop-done,prepush-bash}.json.
- Note in the wave plan: this test is red on main through wave 1 → gate 41 (slow-tests) red; fast-gate (the merge gate) unaffected.

Acceptance criteria (draft):
- Given today's tree, when `bun test src/tests/install/consumer-smoke.test.mts` runs, then it FAILS naming at least crew/hooks/subagent-gate-guard.mts, hooks/pre-push-gate.mts, crew/hooks/pre-tool-use-agent.mts, crew/hooks/otel-post-tool-use.mts, crew/scripts/crew.mts brief-me, crew/scripts/crew.mts show-workflow-state with "Cannot find".
- Given hooks/hooks.json + commands/*.md + agents/*.md, when listShippedEntrypoints runs, then the distinct file set contains the 17 bun .mts hooks, the node .mjs hooks, log_event.sh, crew/scripts/crew.mts and src/scripts/loop.mts (exact counts asserted, not ">20").
- Given stageConsumerCopy output, when inspected, then no node_modules directory exists at any depth under pluginCopy and consumerRepo has exactly one commit.
- Given an entry listed in EXPECTED_FAIL that passes, then the test fails with "remove from EXPECTED_FAIL" (ratchet).

Scope: src/tests/install/**, src/scripts/lib/install/shipped-entrypoints.mts. No fixes here.

## Intake notes

Created via free-text intake; body revised 2026-11-05 after architect /
reviewer / critical-thinking review (see .claude/artifacts/crew/reviews/
20261105T22*-*.md). Re-scored by PM after revision.

## Acceptance criteria (Given-When-Then)

- AC-1: Given today's tree, When `bun test src/tests/install/consumer-smoke.test.mts` runs, Then it FAILS naming at least `crew/hooks/subagent-gate-guard.mts`, `hooks/pre-push-gate.mts`, `crew/hooks/pre-tool-use-agent.mts`, `crew/hooks/otel-post-tool-use.mts`, `crew/scripts/crew.mts brief-me`, and `crew/scripts/crew.mts show-workflow-state` with "Cannot find".
- AC-2: Given `hooks/hooks.json` plus `commands/*.md` plus `agents/*.md`, When `listShippedEntrypoints` runs, Then the distinct file set contains the exact-counted 17 bun `.mts` hooks, the node `.mjs` hooks, `log_event.sh`, `crew/scripts/crew.mts`, and `src/scripts/loop.mts` (exact counts asserted, not ">20").
- AC-3: Given `stageConsumerCopy` output, When inspected, Then no `node_modules` directory exists at ANY depth under `pluginCopy`, and `consumerRepo` has exactly one git commit.
- AC-4: Given an entry listed in `EXPECTED_FAIL` that now passes, When the test runs, Then it FAILS with "remove from EXPECTED_FAIL" (ratchet).
