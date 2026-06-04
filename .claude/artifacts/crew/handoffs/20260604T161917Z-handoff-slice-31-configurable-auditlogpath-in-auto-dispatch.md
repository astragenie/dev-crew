# Task Handoff: SLICE-31: configurable auditLogPath in auto-dispatch

- Created: 2026-06-04T16:19:17.570Z
- From: builder
- To: lead
- Objective: Added resolveAuditLogPath helper and extended appendAuditLog to honor opts.config.loop.auditLogPath with absolute/relative path support and default fallback.
- Allowed Scope:
  - src/scripts/lib/auto-dispatch.mts and src/tests/auto-dispatch.test.mts only
- Forbidden Scope: -
- Deliverable: resolveAuditLogPath exported pure helper, appendAuditLog signature extended with optional AuditLogOpts, 8 new tests covering all resolution paths, all gates green
- Changed Files:
  - src/scripts/lib/auto-dispatch.mts
  - src/tests/auto-dispatch.test.mts
- Confidence: high
- Risks: none
- Suggested Next Handoff: SLICE-31 acceptance criteria satisfied; mark SLICE-31 done and continue with FEAT-034 remaining issues or next triaged FEAT

