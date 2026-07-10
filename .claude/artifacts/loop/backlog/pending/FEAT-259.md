---
id: FEAT-259
status: pending
priority: P2
category: enhancement
target_release: null
created: 2026-07-09
updated: 2026-07-09
depends_on: []
slices: []
derived_from: null
tags: [area:harness, area:dispatch, concern:orchestration, concern:context-budget]
needs_contract: false
needs_ux: false
autonomous_safe: false
pm_reviewed: null
triage_notes: "Filed 2026-07-09 from a live 4-lane parallel-wave run (runner+memory hardening wave 1). Every one of 5 background lane agents finished its work correctly but 4/5 went idle WITHOUT delivering their report via SendMessage — orchestrator had to manually nudge each one. Recovery worked but is manual, and bare idle_notification pings polluted orchestrator context. Automate the report protocol + watchdog; keep orchestrator context flat."
---
## Description

Observed failure pattern (2026-07-09 wave run, 5 dispatched lane agents + 5 reviewers):
agents complete their task, write the report as plain final text (which is NOT delivered
to the orchestrator), then emit `idle_notification`. Orchestrator sees idle-without-report,
must nudge via SendMessage ("send your report now"), agent resends from live context.
Recovery is reliable (resume-not-respawn: same agent, context intact, ~1 message cost) but
100% manual, and the orchestrator inbox additionally accumulates redundant bare
`idle_notification` pings after reports were already received (~8 noise messages in one wave).

Root cause: nothing enforces "final act = SendMessage to main" for dispatched agents.
The existing lesson is already recorded (dev-team#162 / feedback_agent_dispatch_lessons:
"background agents must SendMessage before idle; nudging a RUNNING builder forks execution")
but only as memory prose, not as harness mechanism.

## Scope — four mechanisms

1. **SubagentStop report-gate hook** (highest ROI). Prompt-based SubagentStop hook shipped
   by the plugin: if the agent was dispatched with a report-back instruction and has not
   called SendMessage(to: main) this session, block the stop with reason
   "Send your report via SendMessage to main before stopping — plain final text is not
   delivered." Approve otherwise. Must not block agents that were NOT dispatched with a
   report-back contract (interactive/local agents).

2. **Agent template line.** All dispatch-style agent definitions (builder/reviewer/lane
   templates the plugin generates) gain one mandatory system-prompt line: "Your final plain
   text is not visible to the orchestrator. Your last action MUST be SendMessage to main
   with the structured receipt." Empirical note from the wave run: agents whose prompt had
   an explicit 'Return via SendMessage to main' line reported correctly; weaker phrasings
   ('report back', 'return findings') produced silent idles.

3. **Orchestrator watchdog rule** (dispatch loop): on `idle_notification` for an agent with
   no report logged → auto-nudge ONCE → still silent after nudge → fall back to reading the
   worktree directly (git log + artifacts = source of truth) and mark the lane
   report_missing. HARD GUARD: never nudge an agent whose worktree shows activity (fresh
   mtimes/commits) — nudging a running builder forks execution (dev-team#162).

4. **Context-budget hygiene** (keeps orchestrator context flat across waves):
   - Structured receipt schema instead of prose: {status, items[], commit_shas[],
     evidence_path, deviations[]} — target ≤ 15 lines. Full detail goes to an artifact file;
     the receipt carries the pointer.
   - Suppress/swallow bare idle_notification pings for agents whose report flag is already
     set — never surface them to the orchestrator context.

## Acceptance criteria

- AC1: Given a dispatched agent with a report-back contract that attempts to stop without
  having called SendMessage(to: main), when SubagentStop fires, then the stop is blocked
  with the corrective reason, and the agent's subsequent SendMessage+stop succeeds.
- AC2: Given an agent without a report-back contract, when it stops, the hook approves
  (no false-positive blocking).
- AC3: Plugin-generated dispatch agent templates contain the mandatory final-act line
  (grep-verifiable in generated .md).
- AC4: Watchdog: idle-without-report triggers exactly one auto-nudge; a second silent idle
  marks lane report_missing and the orchestrator proceeds from worktree evidence. A worktree
  with mtimes fresher than N minutes is never nudged.
- AC5: Receipt schema documented + adopted by the plugin's dispatch prompt templates;
  idle pings after receipt-received are not injected into orchestrator context.

## Non-goals

- No respawn-with-fresh-context flows (resume-not-respawn is the point).
- No changes to crew review/validation gates.
- Not adopting any external orchestration framework.
