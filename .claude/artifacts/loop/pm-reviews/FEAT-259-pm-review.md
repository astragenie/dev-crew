---
id: PM-REVIEW-FEAT-259
feature: FEAT-259
reviewed_at: 2026-07-19
pm_customer_impact: 0.55
pm_effort_estimate: 0.65
pm_strategic_alignment: 0.55
pm_technical_risk: 0.65
pm_dependency_depth: 0.15
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-259

## Demand Assessment

- **Evidence:** Direct operational evidence from a live dogfood run, quoted from body: "Observed failure pattern (2026-07-09 wave run, 5 dispatched lane agents + 5 reviewers): agents complete their task ... then emit idle_notification ... Orchestrator sees idle-without-report, must nudge ... ~8 noise messages in one wave." Also cites a prior recorded lesson (dev-team#162 / feedback_agent_dispatch_lessons) that this FEAT converts from memory prose into an enforced mechanism.

## Scope Challenge

- **Scope notes:** Recovery already 'works reliably' per the body (manual nudge, ~1 message cost) — this is operational hygiene/cost-reduction, not a hard blocker, which keeps customer_impact at moderate rather than high. Effort calibration: no clean single-slice cost analog for a 4-mechanism cross-cutting change (hook + templates + watchdog + context hygiene); scored from the rubric table alone. No weak grade dimension currently active (nearest-relevant, observability, sits at 0.82, above the 0.80 threshold) but SLICE-3 (mandatory final-act template line) doubles as an observability-adjacent AC regardless since it makes agent reporting behavior legible/auditable.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.65
- strategic_alignment: 0.55
- technical_risk: 0.65
- dependency_depth: 0.15

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2: real, evidenced operational pain but with an already-working manual mitigation keeps it below P1; technical_risk 0.65 (0.6-0.8 band: cross-module reach across hooks/templates/dispatch-loop, new blocking-hook pattern with high blast radius, though reversible in principle) triggers the mandatory pre-mortem, completed above. effort_estimate 0.65 maps (0.56-0.7 -> 8 points per the assumed banding) to effort_points=8, triggering the decomposition gate — decomposed below with the two design-sensitive landmines (report-gate detection heuristic; watchdog nudge/fresh-mtime guard) isolated into their own slices per runner#393 rule (a), and the template-line edit kept as one mechanical batch slice per rule (b).

## Risks

- Two-weeks-later failure mode: the SubagentStop report-gate hook's 'was this agent dispatched with a report-back contract' detection produces a false positive on an interactive/local (non-dispatched) agent, blocking a normal session-ending stop for a user with no dispatch context at all — exactly the failure AC2 is meant to prevent, and the highest-likelihood real-world review failure given hook heuristics are inherently approximate.
- Rollback is NOT a clean single-repo git revert: the SubagentStop hook ships via the plugin's hooks/*.mjs + settings wiring, installed into every consumer repo on next `/runner:install` or plugin refresh — a bad version needs a plugin re-release and consumer re-install to fully clear everywhere it's already landed, i.e. cross-plugin coordination, not just `git revert`.
- Coverage gap an existing test would NOT catch: nothing today simulates a SubagentStop event firing for an agent that was NOT dispatched with a report-back contract (a plain interactive session) — AC2's no-false-positive guarantee is entirely new test surface.
- Cascade note: the SubagentStop hook sits on a halt-adjacent path that can block agent termination across every dispatch in the plugin ecosystem (not just this repo) — a bug here cascades globally, not locally, until the plugin is patched and reinstalled.
