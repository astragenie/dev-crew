# Upstream request: 'team-lead' mailbox label collides with retired crew lead mode

- **Upstream**: astragenie/dev-team (crew plugin)
- **Ticket**: https://github.com/astragenie/dev-team/issues/200
- **Status**: open (filed 2026-07-10)
- **Impact on loop**: cosmetic/operator-confusion only — no functional dependency, no FEAT blocked.

## Summary

During autonomous slice runs, Claude Code teams/mailbox echoes (`task_assignment`
redeliveries, idle notifications) surface in the operator window labeled
`team-lead`. That is the main session's harness identity, NOT the crew `lead`
orchestrator mode (retired in runner-plugin v0.43 / FEAT-191). Operators reading
the window can mistake the label for a resurrected lead mode.

Asked upstream for: docs clarification, non-colliding main-session naming in
crew dispatch tooling, and guidance on suppressing duplicate task_assignment
redeliveries.
