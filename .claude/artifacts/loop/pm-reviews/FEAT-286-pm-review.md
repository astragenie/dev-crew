---
id: PM-REVIEW-FEAT-286
feature: FEAT-286
reviewed_at: 2026-08-04
pm_customer_impact: 0.45
pm_effort_estimate: 0.25
pm_strategic_alignment: 0.55
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-286

## Demand Assessment

- **Evidence:** Directly reproduced 2026-08-04: 1 failure in 4 full parallel `bun test` runs, independently observed twice in 3 runs by a separate builder agent; the same file passes 12/12 in isolation, confirming load-dependence not order-dependence. Root cause is precisely traced, not hypothesized: runHook (src/tests/capture-at-close-hook.test.mts:72-90) pins CAPTURE_AT_CLOSE_TIMEOUT_MS=500 in the spawned hook's env; writeFakeCli's win32 path (lines 42-63) returns a .cmd shim that cold-starts a second node process, and under 16-way parallel load that chain can exceed 500ms before the fake CLI's fs append runs, so hooks/capture-at-close.mjs's fail-open timeout — confirmed load-bearing and correct — fires first and readCliCalls sees an empty log.

## Scope Challenge

- **Scope notes:** Test-infrastructure-only fix. hooks/capture-at-close.mjs must not change — its fail-open timeout contract is correct and load-bearing per the FEAT's own scope note. Touches only src/tests/capture-at-close-hook.test.mts: raise the test-side timeout override and replace the single-shot readCliCalls read with a bounded poll for the log file. Do not mark the test skipped or loosen the assertion to calls.length >= 0 — that deletes the only coverage proving the CLI is invoked, which matters because FEAT-259's report-gate work is about to build on this same hook.

## Scores

- customer_impact: 0.45
- effort_estimate: 0.25
- strategic_alignment: 0.55
- technical_risk: 0.20
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: No product defect exists here — hooks/capture-at-close.mjs behaves exactly as designed. What's real is a recurring CI cost: bun test is CI gate 12, so this flake randomly fails unrelated PRs and trains reviewers to re-run red builds, which is a live, low-grade tax rather than a one-off. That puts it above a purely inert issue but well below the P1 tier reserved for data-loss (FEAT-284) or gating-correctness defects (FEAT-283): customer_impact and technical_risk are both markedly lower than FEAT-282/285 because there is no production behavior at stake and the fix is fully prescribed (raise a test-only timeout, poll instead of single-read) with zero touch to shipped code. Effort and risk are correspondingly the lowest of any FEAT in this session's batch, which lands it at P2 rather than P3 given the CI-gate blast radius (every PR touches gate 12) and the direct enabler dependency FEAT-259 has on this test file staying trustworthy.

## Risks

- Raising the test timeout without also switching to a poll-based assertion just widens the race window rather than closing it
- Removing the .cmd-shim indirection on win32 to cut one process-start could make the test path diverge from the real production spawn chain enough that it stops testing what actually ships
