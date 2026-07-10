---
id: FEAT-260
status: pending
priority: null
category: tooling
target_release: null
created: 2026-07-10
updated: 2026-07-10
depends_on: []
slices: []
derived_from: null
autonomous_safe: null
pm_reviewed: null
triage_notes: "Filed 2026-07-10 from the v0.68.0 release run. slow-tests failed BOTH in-run attempts on self-hosted actions-runner-4 with `memory-transport.test.mts > sendViaProvider — runtime discovery (no injection) > discovers the env-pinned plugin root and delivers via its selector` (sendViaProvider returned false), then passed clean on a full re-run; passes locally and passed on the immediately-preceding commit whose diff could not touch the transport path. Runner-box-sensitive, not code-sensitive."
---
# FEAT-260: harden or quarantine memory-transport runtime-discovery test on self-hosted CI

## Problem

The runtime-discovery test exercises `candidateRoots()` + `resolveFromRoot()`
+ a `pathToFileURL` dynamic import with NO injected provider — it depends on
the env-pinned fake root winning against whatever plugin state exists on the
self-hosted runner box. On actions-runner-4 it returned `false` twice in one
run (surviving the in-job retry), costing a full release-gate rerun; the
in-job retry does not help because the box state is stable within a run.

## Proposed direction (pick at triage)

1. Diagnose why discovery degrades on runner-4 (leftover plugin cache /
   astramem install shadowing the env root? cwd-relative candidate ordering?)
   and make the env-pinned branch strictly win when set, or
2. Make the test hermetic (assert against a fully isolated HOME/plugin-root
   sandbox), or
3. Move it to the `worktree-quarantine (known-flaky, non-blocking)` lane
   until 1/2 lands.

## Acceptance criteria

- [ ] Given the env-pinned root is set, When sendViaProvider discovers
      providers on a machine with unrelated plugin installs, Then the pinned
      root wins deterministically (test proves it under a polluted sandbox).
- [ ] slow-tests on self-hosted runners passes 10/10 consecutive scheduled
      runs with no retry consumed by this test.
