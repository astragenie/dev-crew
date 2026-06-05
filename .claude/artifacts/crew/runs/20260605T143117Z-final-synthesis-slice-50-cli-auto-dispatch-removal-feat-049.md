# Final Synthesis: SLICE-50: CLI auto-dispatch removal — FEAT-049

- Created: 2026-06-05T14:31:17.863Z
- Owner: lead-session
- Outcome: completed
- Summary: Removed dispatchAgent invocations from four CLI subcommands (backlog enrich, backlog add researcher, spec decompose architect, slice complete doc-writer). Each now exits non-zero (or graceful no-op for backlog add) with stderr refusal naming the slash flow + DEC-011. Backward-compat flags (--no-*) kept as no-op + deprecation warning. dispatchAgent + appendAuditLog remain as opt-in audit infra. DEC-011 supersedes DEC-004; CLAUDE.md updated. Gates: review PASS (commit 7e8790a), validation PASS (6/6 scenarios, 772/772 tests), lint clean, build clean. v0.10.0 CHANGELOG entry drafted by loop:document-writer.
- Changed Files / Evidence: -
- Run / Test Steps: -
- External Deltas: none
- Risks: -
- Next Step: -

