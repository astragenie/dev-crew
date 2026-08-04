---
id: FEAT-259
status: in-progress
priority: P1
category: enhancement
target_release: null
created: 2026-07-09
updated: 2026-08-04
depends_on: []
slices: [SLICE-187, SLICE-183, SLICE-184, SLICE-185, SLICE-186]
derived_from: null
tags: [be]
needs_contract: true
needs_ux: false
autonomous_safe: false
pm_reviewed: 2026-08-03
triage_notes: "P1 (raised from the original P2): recurrence with zero decay after a month despite an existing documented lesson and active manual mitigation, unbounded and compounding operator/orchestrator attention cost as dispatch volume grows (wave mode expansion), and direct conflict with this repo's own 'do not stop for confirmation' autonomous-loop mission together outweigh the now-confirmed-smaller (but not zero) implementation surface. Pre-mortem completed above per the mandatory P1 trigger."
github_issue: 504
github_url: "https://github.com/astragenie/runner-plugin/issues/504"
pm_customer_impact: 0.68
pm_effort_estimate: 0.58
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
pm_composite_priority: P1
pm_autonomous_safe: false
proposed_slices:
  - id_suffix: -SLICE-1
    title: "SubagentStop report-gate hook, registered into existing hooks.json array"
    points: 1
    estimated_tokens: 80000
  - id_suffix: -SLICE-2
    title: Structured receipt schema definition + docs
    points: 2
    estimated_tokens: 100000
  - id_suffix: -SLICE-3
    title: Mandatory final-act line across all dispatch agent templates (batch)
    points: 1
    estimated_tokens: 60000
  - id_suffix: -SLICE-4
    title: Orchestrator watchdog rule (auto-nudge-once + fresh-mtime guard)
    points: 2
    estimated_tokens: 120000
  - id_suffix: -SLICE-5
    title: Idle-ping suppression + context-budget wiring into dispatch loop
    points: 1
    estimated_tokens: 60000
proposed_slices_shipped: []
proposed_slices_shipped_commits: []
started_at: 2026-08-04
slices_complete: [SLICE-187]
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

## Proposed slices (PM decomposition)

- SLICE-1: SubagentStop report-gate hook (report-back-contract detection) (2 pts)
- SLICE-2: Structured receipt schema definition + docs (2 pts)
- SLICE-3: Mandatory final-act line across all dispatch agent templates (batch) (1 pts)
- SLICE-4: Orchestrator watchdog rule (auto-nudge-once + fresh-mtime guard) (2 pts)
- SLICE-5: Idle-ping suppression + context-budget wiring into dispatch loop (1 pts)

## New evidence (2026-08-03 session) — scope refinement for SLICE-4 and SLICE-5

Observed across one multi-agent session (5 dispatched specialists), independent
of the 2026-07-09 wave run that motivated this FEAT:

**A third failure mode, not currently covered by any proposed slice.** SLICE-4's
watchdog is scoped to "idle-without-report". A worktree builder (SLICE-181) instead
stopped **mid-edit with work uncommitted** — `git log` HEAD still at main, 7 files
modified, live `exactOptionalPropertyTypes` type errors, and a final output that was
a severed sentence fragment rather than a report. This is strictly worse than a
missing report: an uncommitted worktree is **destroyed on prune**, so the work is
lost outright, not merely undelivered. SLICE-4 must therefore detect
`stopped && worktree has uncommitted changes` as its own condition, and the
correct recovery is a nudge to *commit*, not a respawn. The existing HARD GUARD
still applies — safe to nudge only because the agent was stopped; never nudge a
running builder (forks execution, dev-team#162).

**SLICE-5 (idle-ping suppression) confirmed with 9 occurrences in one session**,
all bare `idle_notification` pings emitted AFTER the agent's report had already
been delivered and acknowledged, several after explicit close-out. Sources were
varied (pm, reviewer, builder), so this is agent-type-independent. Confirms the
original ~8-noise-messages-per-wave observation at a comparable rate a month later.

**Related durable learnings** (`.claude/artifacts/loop/learnings.jsonl`):
`idle-ping-after-report`, `worktree-builder-stops-uncommitted`,
`worktree-artifact-loss` (subagent review artifacts land untracked inside the
worktree and die on prune — relevant to SLICE-2's receipt/evidence-path design).

**Downstream dependency discovered:** FEAT-275 (pause telemetry) cannot record
builder-tier dispatch outcomes at all until SLICE-1 lands. Builders emit no
artifact by design (`docs/sop/specialist-pause-handling.md` L128-131) and
`slice-linker/dispatch.mts` is pure prompt-string assembly with no execution or
observation machinery, so no builder-tier pause signal exists in default
(non-wave) orchestrator mode. FEAT-275 shipped narrowed to reviewer/validator +
wave coverage specifically because of this gap.

## SLICE-187 shipped with a known AC2 caveat (2026-08-04)

The report-gate hook detects "was this agent dispatched with a report-back
contract" by scanning the subagent's first transcript turn — its dispatch
prompt — for the literal tokens "SendMessage" and "main" within an 80-char
window. That is textual proximity, not semantic understanding: it cannot
distinguish an instruction addressed to *this* agent from prose merely
describing the mechanism.

Concrete false-positive shape, found in review:

> Investigate why FEAT-259's SubagentStop hook exists. Background: the fix
> requires the agent to call SendMessage(to: 'main', ...) before stopping.
> Read hooks/report-gate.mjs and summarize the detection regex. This is a
> foreground call — I will read your returned text directly, no need to send
> anything.

That trips the regex on an 8-char span while explicitly instructing the agent
NOT to send. The risk is elevated right now precisely because FEAT-259's own
description text (lines 71-72 of this file) contains the matching phrase, so
any dispatch that quotes this FEAT is a candidate.

This is FEAT-284's defect class — a regex over prose treated as evidence —
reappearing in a new place within the same session. The severity is not
comparable, and that distinction is the reason it shipped rather than being
rejected:

- FEAT-284 silently destroyed planned work with no symptom.
- This produces one extra visible retry turn, bounded by `stop_hook_active`
  (a second stop is always approved), and never loses data.

Shipped **default-OFF** (`features["report-gate"].enabled`, absent resolves
off), so nobody is blocked until they opt in. Before any wider rollout:
document operator-facing that detection is prompt-text proximity rather than
semantic, so an operator seeing an unexpected block understands why.

Two smaller review notes carried forward: `scanTranscript`'s read stream has
no explicit `.on('error')` handler, so a narrow TOCTOU race (stat succeeds,
read then fails) would surface as an uncaught stream error rather than a
caught rejection — AC2 still holds, since a crash cannot emit the block JSON
and therefore fails toward approve, just uninstrumented. And a nudge that the
agent ignores is silently approved on the second stop with no telemetry that
the nudge failed; that observability gap is FEAT-275's territory, not this
slice's.
