---
id: FEAT-263
status: done
priority: P2
category: feature
target_release: null
created: 2026-07-15
updated: 2026-07-15
depends_on: []
slices: [SLICE-160]
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.55
pm_technical_risk: 0.3
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-07-15
autonomous_safe: true
triage_notes: "P2, autonomous-safe test-infra quick win: technical_risk lands in the 0.3-0.5 band (new pattern — raw HTTP fetch-with-timeout — confined to one test-infra module, no contract/schema change, trivially git-revertible), effort_estimate 0.2 confirmed against the FEAT-244/SLICE-148 cost analog (single small module), dependency_depth 0.1 (no depends_on, no blocking FEATs found via grep). customer_impact/strategic_alignment scored moderate (0.55 each) rather than low because there's a real filed issue plus a live-reproduced failure mode during this very dispatch, but impact is scoped to developers/agents running the memory e2e suite, not end-product users, which caps it below P0/P1 territory. Effort well under the 8-point decomposition-gate threshold, so no proposedSlices emitted."
started_at: 2026-07-15
slices_complete: [SLICE-160]
completed_at: 2026-07-15
---
## Description

Astramem memory e2e: preflight the astramem-local daemon on 127.0.0.1:7777 before exercising MCP tools. Add a health-check helper that GETs /health with a short timeout and, when the daemon is unreachable or status not in {ok,starting,degraded}, fails fast with an actionable message telling the operator to start the daemon (node dist/cli/index.js reinstall, or serve --port 7777) instead of an opaque ECONNREFUSED. Support an ASTRAMEM_E2E env toggle to skip vs require the memory e2e. Document the :7777 daemon dependency + start command in test docs. Source: runner-plugin issue #514.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given the astramem-local daemon is listening and healthy on 127.0.0.1:7777, When the e2e preflight helper issues a GET to `http://127.0.0.1:7777/health` with a short timeout (e.g. `AbortSignal.timeout(2000)`), Then it resolves successfully and the memory e2e suite proceeds because the reported status is one of `ok`, `starting`, or `degraded`.
- AC-2: Given the astramem-local daemon is NOT running on 127.0.0.1:7777, When the preflight helper runs before the memory e2e suite, Then the call fails fast (bounded by the configured timeout, not left to the OS-level connect timeout) and the failure surfaces an actionable message instructing the operator to start the daemon via `node dist/cli/index.js reinstall` or `serve --port 7777`, instead of an opaque `ECONNREFUSED` stack trace.
- AC-3: Given the daemon responds to GET /health but reports a status outside `{ok, starting, degraded}` (e.g. `error` or an unrecognized string), When the preflight helper evaluates the response body, Then it treats this the same as an unreachable daemon (fails fast with the same actionable start-command message from AC-2), not a generic JSON-parse or type error.
- AC-4: Given `ASTRAMEM_E2E` is unset, or set to `skip`/`0`/`false`, When the memory e2e test suite starts, Then the daemon preflight and every memory-dependent test in the suite are skipped (reported as skipped, not failed or errored) and no network request to 127.0.0.1:7777 is made.
- AC-5: Given `ASTRAMEM_E2E` is set to `require`/`1`/`true` and the daemon preflight fails (per AC-2 or AC-3), When the memory e2e suite runs, Then the run fails loudly with a non-zero exit / failing test carrying the actionable message, rather than silently skipping.
- AC-6: Given the daemon port is unreachable (nothing listening on 127.0.0.1:7777), When the preflight helper's GET /health call is issued, Then the call resolves or rejects within the documented short timeout window and never hangs indefinitely — regression-guards the exact failure mode observed live during this PM review, where an astramem MCP call hung 300s with no response.
- AC-7: Given a contributor wants to run the memory e2e suite for the first time, When they read the updated test docs (e.g. `docs/sop/memory-bridge.md` or an equivalent e2e-setup doc), Then the docs explicitly state the 127.0.0.1:7777 daemon dependency, the exact start commands (`node dist/cli/index.js reinstall`, `serve --port 7777`), and the accepted `ASTRAMEM_E2E` values (`skip` vs `require`) with their default behavior.
