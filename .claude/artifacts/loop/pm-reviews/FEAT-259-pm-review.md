---
id: PM-REVIEW-FEAT-259
feature: FEAT-259
reviewed_at: 2026-08-03
pm_customer_impact: 0.68
pm_effort_estimate: 0.58
pm_strategic_alignment: 0.65
pm_technical_risk: 0.6
pm_dependency_depth: 0.15
composite_priority: P1
autonomous_safe: false
---
# PM Review — FEAT-259

## Demand Assessment

- **Evidence:** RE-SCORE (2026-08-03) of an already-triaged FEAT (originally scored P2 on 2026-07-19; that scoring's frontmatter/triage_notes are the baseline this entry revises). New evidence: the same specialist-idle-without-report failure recurred on 2026-08-02 — 7 dispatched specialists (builders + reviewers) went idle without delivering a report, each requiring a manual SendMessage nudge, versus the original 2026-07-09 observation of 5 lane agents + 5 reviewers (10 instances). The raw count is lower, but the material fact is elapsed time: roughly a month passed between observations with the documented lesson (dev-team#162) and the manual mitigation both already in place, and the failure class did not decay — it recurred at a comparable rate. Independently verified the claimed implementation-surface reduction: .claude-plugin/hooks/hooks.json's `SubagentStop` array already has two live command-type hook entries (`emit-astrarunner-event.mjs subagent_stop`, `capture-at-close.mjs`) — the hook event slot, the array registration pattern, and the command-hook invocation mechanism are all already wired and exercised in production. SLICE-1's report-gate hook is a new script registered into that existing array, not new hook-plumbing invention; this is confirmed by reading hooks.json directly, not assumed.

## Scope Challenge

- **Scope notes:** Re-scoring on the merits, not defaulting to the operator's suggested direction: the case for raising from P2 to P1 rests on three independently-verified points, not on the recurrence count alone. (1) The original triage_notes' reasoning ('already-working manual mitigation keeps it below P1') is empirically weakened by the new evidence — a workaround that fully contains per-incident cost but shows zero decay after a month, while the manual-nudge cost is unbounded operator/orchestrator attention, is expense that does not shrink on its own; if anything it compounds as dispatch volume grows (this repo is simultaneously expanding parallel dispatch surface via wave mode — see the FEAT-276 re-score in this same batch — which increases, not decreases, the number of specialist dispatches exposed to this failure mode over time). A workaround argues for LOWER priority only when it decays or scales sublinearly; here it does neither. (2) This directly undermines the repo's own 'Autonomous Loop — HARD RULES' mission ('Run until PASS. Do not stop for confirmation... Auto-continue.') — an idle-without-report specialist is a stealth stop-for-confirmation the orchestrator must manually detect and resolve, which is exactly the class of interruption the loop's hard rules exist to eliminate; this raises strategic_alignment from 0.55 to 0.65 versus the original scoring. (3) The hooks.json read lowers effort_estimate modestly (0.65 -> 0.58, still inside the 0.56-0.7 -> 8-point Fibonacci band established by this FEAT's own original scoring) because only SLICE-1 (of five) benefited from confirmed existing plumbing — SLICE-2 (receipt schema), SLICE-3 (template line across all agent defs), SLICE-4 (watchdog nudge/fresh-mtime guard), and SLICE-5 (idle-ping suppression) are unchanged, real, still-cross-cutting work spanning agents/*.md templates and the dispatch-loop watcher. Net: customer_impact and strategic_alignment moved up enough, and effort/risk stayed in the same or a slightly friendlier band, to justify P1 over the original P2 — this is not a foregone conclusion; had the hooks.json read shown NO existing SubagentStop wiring, I would have kept this at P2 given the effort would not have shrunk to offset the unchanged risk.

## Scores

- customer_impact: 0.68
- effort_estimate: 0.58
- strategic_alignment: 0.65
- technical_risk: 0.60
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P1
autonomous_safe: false
reasoning: P1 (raised from the original P2): recurrence with zero decay after a month despite an existing documented lesson and active manual mitigation, unbounded and compounding operator/orchestrator attention cost as dispatch volume grows (wave mode expansion), and direct conflict with this repo's own 'do not stop for confirmation' autonomous-loop mission together outweigh the now-confirmed-smaller (but not zero) implementation surface. Pre-mortem completed above per the mandatory P1 trigger.

## Risks

- Two weeks later this could fail review/validation because the SubagentStop report-gate hook needs a reliable in-session signal for 'has this agent called SendMessage(to: main) yet' — if that signal is inferred from something fragile (e.g. scanning recent transcript text for a keyword) rather than a structured event/marker, false positives (blocking an agent that DID report via a channel the heuristic didn't recognize) are the most likely review-blocking defect, not the hook registration itself.
- Rollback: reverting the hook script + its hooks.json entry is a clean `git revert` with no data/schema migration — BUT if the watchdog rule (SLICE-4) ships in the same wave and its fresh-mtime guard has a bug that causes it to nudge an actively-running builder (the exact dev-team#162 failure this FEAT is designed to prevent), that specific regression forks execution and is NOT cleanly revertible after the fact (the forked work already happened) — SLICE-4's guard needs its own dedicated test proving 'never nudge on fresh mtimes', isolated from SLICE-1's hook logic per rule (a).
- Which existing test would NOT catch a regression here: there is no existing automated test that dispatches a real subagent and asserts the SubagentStop hook actually blocks a report-less stop end-to-end (only unit-level hook-script tests are plausible without live agent dispatch) — an integration-level gap that AC1/AC2 in the FEAT body name but that the proposed slices don't yet explicitly allocate a slice to; recommend SLICE-1 or SLICE-2 absorb a scripted-stdin hook-invocation test (feed the hook a synthetic SubagentStop event JSON) as the closest feasible substitute for a live end-to-end dispatch test.
