---
id: PM-REVIEW-FEAT-243
feature: FEAT-243
reviewed_at: 2026-07-09
pm_customer_impact: 0.55
pm_effort_estimate: 0.1
pm_strategic_alignment: 0.7
pm_technical_risk: 0.2
pm_dependency_depth: 0.3
composite_priority: P2
autonomous_safe: false
---
# PM Review — FEAT-243

## Demand Assessment

- **Evidence:** ACs artifact (2026-07-07-watcher-acs-eta.md:78-85, B1.5 section) AC-1: 'unattended reaction completion is >=70% ... current dispatch pause rate 66.7% is the known weak link — watcher dispatches/files only, never inlines fixes.' Plan risk-ranking #2 (2026-07-07-watcher-implementation-plan.md:235-236): 'Reaction quality (pause rate 66.7% on recent dispatches) — pilot measures; circuit breakers bound cost; watcher never inlines fixes.' Stakeholder: the fleet operator, who is the explicit human-in-the-loop for this gate ('a human runs and observes the pilot itself,' ACs artifact line 111). Lessons digest (`bun src/scripts/loop.mts lessons recent 5`, SLICE-96/97 grades) independently corroborates the underlying risk this gate exists to catch: 'Specialist-pause repeated — crew:lead returned narration ... without calling Agent' and 'Specialist-pause recurred twice ... Pattern is now persistent enough that the parent loop should bypass crew:lead' — the same pause-dynamics class B1.5's 70% threshold is designed to detect before fleet rollout.

## Scope Challenge

- **Scope notes:** This is explicitly a milestone/gate, not a buildable FEAT — ACs artifact (line 69-76) instructs 'Model as a checklist/milestone FEAT (frontmatter type: milestone or equivalent gate marker), not a scored autonomous_safe item.' I concur and score autonomousSafe: false per that recommendation; no divergence. Smallest deliverable: the gate is already minimal (0 build slices) — nothing to cut further except possibly the soak duration, which I do NOT recommend shortening below 3 days since it is the plan's explicit minimum for a calendar-bound safety validation, not a padding buffer. AC clarity: good — all 6 ACs are Given-When-Then with evidence sources named as 'pilot state files + operator log,' explicitly non-automated per the plan's own framing (not a vagueness defect, a deliberate operational-evidence type). Overlap: none — no other FEAT in this batch or in done/in-progress covers a pilot soak. Weak-dimension check: none of the 7 grade dimensions are below 0.80 (see FEAT-242 note); N/A anyway since this FEAT has no build slices to carry an AC. Effort calibration: no cost analog applicable — this FEAT has 0 build slices and its 'cost' is calendar wall-clock (>=3 days), not loop-dispatch effort; effort_estimate scored at the floor of the rubric (0.1) to reflect trivial code-adjacent scope (frontmatter/type marker only), which maps to 2 Fibonacci points via pm-effort-mapper.mts — well under the FEAT-168 decomposition threshold, no proposed_slices needed. Per Framework 6, since effort_points < 8, decomposition gate does not apply and composite_priority need not be 'needs-review' on that basis. NOT included in acs[] since compositePriority is P2 and --deep/--spec were not passed — ACs above (Framework 2) are quoted as evidence of clarity, not re-drafted, per the priority-gating table in the FEAT-277 contract.

## Scores

- customer_impact: 0.55
- effort_estimate: 0.10
- strategic_alignment: 0.70
- technical_risk: 0.20
- dependency_depth: 0.30

## Priority Derivation

composite_priority: P2
autonomous_safe: false
reasoning: P2: essential safety gate for fleet rollout but not a build item competing for loop dispatch cycles — it is human-run and calendar-bound (>=3 days), so it does not carry the same urgency-for-the-loop as FEAT-242. autonomousSafe: false per the plan's own explicit framing, confirmed by my own review (no divergence).

## Risks

- Operational risk (not a code pre-mortem, since this FEAT has no build slices — pre-mortem is not mandatory here as technical_risk is 0.2 and priority is P2, but naming the risk anyway per Framework 3's cascade guidance): the pilot's single biggest failure mode is the pause-rate ceiling itself — if 66.7% doesn't improve, B1.5 fails its first soak window and the gate gets re-run for another >=3-day cycle rather than closing on schedule, which is a wall-clock cost the loop cannot compress with more dispatch.
- Process risk named explicitly in the plan (2026-07-07-watcher-acs-eta.md:346-351, 'B1.5 is not independently loop-gradeable'): because it's a milestone rather than a scored FEAT, there is no `grade.recorded` event or automatic backlog-close signal — an operator must manually confirm exit criteria and manually unblock B2's merge-to-main recommendation. A forgotten manual check is the realistic failure mode, not a code defect.
- Dependency risk: this FEAT depends on FEAT-242 (B1) being merged AND deployed (not just merged) before the soak can even start — if FEAT-242 lands but the scheduler task is never registered on a live machine, the pilot clock never starts and the gate silently stalls with no automated alert (B2's staleness alerting, which would catch this, is itself gated behind B1.5 passing first — a chicken-and-egg observability gap worth flagging to the operator).
