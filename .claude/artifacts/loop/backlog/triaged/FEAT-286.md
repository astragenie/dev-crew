---
id: FEAT-286
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.55
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-04
autonomous_safe: true
triage_notes: "No product defect exists here — hooks/capture-at-close.mjs behaves exactly as designed. What's real is a recurring CI cost: bun test is CI gate 12, so this flake randomly fails unrelated PRs and trains reviewers to re-run red builds, which is a live, low-grade tax rather than a one-off. That puts it above a purely inert issue but well below the P1 tier reserved for data-loss (FEAT-284) or gating-correctness defects (FEAT-283): customer_impact and technical_risk are both markedly lower than FEAT-282/285 because there is no production behavior at stake and the fix is fully prescribed (raise a test-only timeout, poll instead of single-read) with zero touch to shipped code. Effort and risk are correspondingly the lowest of any FEAT in this session's batch, which lands it at P2 rather than P3 given the CI-gate blast radius (every PR touches gate 12) and the direct enabler dependency FEAT-259 has on this test file staying trustworthy."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Raise test timeout override; poll for fake-cli-calls.jsonl instead of single-shot read
    points: 1
    estimated_tokens: 60000
---
## Description

Flaky test: capture-at-close hook 'memory.enabled = auto -> gate passes, CLI is invoked' fails intermittently under parallel test runs on Windows.

Reproduction, 2026-08-04. Observed 1 failure in 4 full parallel runs of bun test src/tests/ --parallel (and independently by a builder agent, which saw it twice in 3 runs). The same file passes 12/12 in isolation across repeated runs, so it is load-dependent rather than order-dependent. Failing case: src/tests/capture-at-close-hook.test.mts, describe 'capture-at-close.mjs — config gate', test 'memory.enabled = "auto" -> gate passes, CLI is invoked', assertion expect(calls.length).toBe(1) receiving 0.

Diagnosis. The test harness's runHook (src/tests/capture-at-close-hook.test.mts:72-90) pins CAPTURE_AT_CLOSE_TIMEOUT_MS to 500 in the spawned hook's env. hooks/capture-at-close.mjs uses that value as a hard cap on the spawned astramem-local CLI, deliberately, so a wedged daemon can never hang session close. On win32 writeFakeCli (line 42-63) returns a .cmd shim that in turn cold-starts node against the fake CLI script, and only that script appends to fake-cli-calls.jsonl. Under 16-way parallel load the cmd-shim plus node cold start can exceed the 500 ms budget, the hook's timeout fires first, the append never happens, and readCliCalls returns an empty array. Nothing is wrong with the product code -- the hook's fail-open timeout is behaving exactly as designed; the test simply budgets less wall clock than a contended Windows spawn chain needs.

This is a real CI liability, not cosmetic: bun test is CI gate 12, so a random failure here fails an unrelated PR and trains reviewers to re-run red builds. It also erodes trust in a test file that guards a SubagentStop hook, which FEAT-259's report-gate work is about to build on.

Fix direction, in preference order. (a) Give the test a materially larger timeout than production uses (the value is already injected per-run, so raising it only for tests changes no shipped behavior) and assert against a bounded poll for the log file rather than a single read, so the assertion waits for the append instead of racing it. (b) Alternatively, drop the .cmd shim indirection on win32 for tests that only need to observe an invocation, invoking node directly so one process start is removed from the critical path. Do not fix this by marking the test skipped or by loosening the assertion to calls.length >= 0 -- that removes the only coverage proving the CLI is invoked at all.

Scope note: this is a test-reliability fix. hooks/capture-at-close.mjs itself should not change; its fail-open timeout contract is correct and load-bearing.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- Given the capture-at-close hook test suite runs under 16-way parallel load on Windows, when the "memory.enabled = auto" test executes, then it does not fail due to the CLI-invocation timeout racing a contended Windows spawn chain.
- Given runHook's CAPTURE_AT_CLOSE_TIMEOUT_MS test override, when the test env is constructed, then it uses a value materially larger than the current 500ms purely for test-side wall-clock headroom, with no change to hooks/capture-at-close.mjs's shipped default.
- Given the fake CLI has been invoked, when readCliCalls is checked, then the test polls with a bounded retry/backoff for fake-cli-calls.jsonl to appear instead of reading it exactly once immediately after spawnSync returns.
- Given the fix lands, when bun test src/tests/ --parallel --timeout 60000 is run repeatedly under load (e.g. 10 consecutive full-suite parallel runs), then the capture-at-close-hook test file shows zero flakes.
- Given hooks/capture-at-close.mjs, when the fix is reviewed, then its fail-open timeout contract is unchanged — no diff to the hook itself.

## Proposed slices (PM decomposition)

- SLICE-1: Raise test timeout override; poll for fake-cli-calls.jsonl instead of single-shot read (1 pts)

## Second affected file, higher failure rate (2026-08-04, same day)

`src/tests/guard-feat-dispatch-hook.test.mts` exhibits the same defect and
fails harder than the originally-reported file.

Observed on CI run 30950092126 (commit `cd74bd2e`): two tests timed out at
exactly 60000ms each —

  - "guard-feat-dispatch: warn-only (exit 0) when
    features.dispatch-guard-block.enabled=false"
  - "guard-feat-dispatch: explicit enabled=true behaves like default (blocks)"

Both are timeouts on `spawnSync(process.execPath, [hookPath])`
(`runHook`, line 47), not assertion failures. Locally the file passes 15/15
in about one second, three consecutive runs.

**Failure rate is worse than capture-at-close's.** The `slow-tests` job
already retries on hang/failure and **both attempts failed**; a manual re-run
of the identical commit then passed. Two failures and one pass on unchanged
code, versus roughly one in four for `capture-at-close-hook.test.mts`.

Ruled out as causes, so the fix does not chase them:

- **The feature-flag read.** These two are the only tests in the file that
  write a `features` block to `.claude/loop.json`, which is a suggestive
  correlation — but `isFeatureEnabledLite` (`hooks/feature-flag-lite.mjs:33`)
  is a synchronous `readFileSync` plus `JSON.parse` wrapped in a catch. It
  cannot block for 60 seconds. The correlation is likely that these two take
  the slightly longer path and so are the first to exceed the budget under
  contention, not that the flag read hangs.
- **A SLICE-195 regression.** The failure appeared on the first push
  containing SLICE-195 while the prior commit (`a1088b72`) was green, which
  looked causal. It is not: the re-run of the same commit passed with no
  changes. SLICE-195 added six tests that build real temp directory trees,
  which plausibly raised parallel I/O contention enough to tip an already
  fragile spawn test — a trigger, not a cause.

This strengthens the FEAT's scope rather than changing it: the fix should be
applied to the shared pattern (spawn-based hook tests racing a wall-clock
budget under `--parallel`), not to one file. Both affected files spawn a node
process per test and assert on its output within a fixed window.

Worth stating plainly, because it is the actual risk: this failure mode
trains reviewers to re-run red CI without reading it. That habit is more
expensive than either flake, and it is what turns a green signal into no
signal at all — the theme running through FEAT-281, FEAT-287 and FEAT-284.
