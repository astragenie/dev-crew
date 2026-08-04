---
id: FEAT-286
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
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