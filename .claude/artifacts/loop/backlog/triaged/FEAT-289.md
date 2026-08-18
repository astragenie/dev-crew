---
id: FEAT-289
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-05
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.6
pm_technical_risk: 0.35
pm_dependency_depth: 0.1
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-05
autonomous_safe: true
triage_notes: "customer_impact and strategic_alignment are moderate-high (0.5/0.6): the friction is real and recurring but indirect (developer/CI experience, not end-user-visible behavior), and the extraction also cuts per-dispatch token cost since the full pm.md prompt ships on every PM invocation today. effort_estimate at 0.4 reflects the higher-effort preferred fix (restructuring ~335 lines into reference material) rather than the near-zero-effort cap bump the FEAT itself rejects. None of the disqualifying dimensions exceed 0.6, and with inline ACs supplied autonomous_safe holds true. Composite lands P2: impact (0.5) doesn't clear the 0.7 P1 threshold and alignment (0.6) doesn't clear 0.8, so it falls through to the P2 default — appropriately below FEAT-288/FEAT-290's P1 despite gating one of them, since the pain here is friction rather than an active production defect."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Extract PM 5-dimension scoring rubric from pm.md into a skill/reference
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["GIVEN agents/pm.md currently inlines the 5-dimension scoring rubric, WHEN the extraction lands, THEN that rubric moves to a skill/reference file the PM agent reads on demand, reducing pm.md's line count correspondingly.", "GIVEN the rubric has moved out of pm.md, WHEN the PM is dispatched for /runner:triage, THEN it produces scores identical in structure and behavior to before the extraction — no regression to scoring output."]
  - id_suffix: -SLICE-2
    title: Extract demand/scope-challenge/risk-radar/AC-drafting frameworks from pm.md
    points: 2
    estimated_tokens: 100000
    acceptance_criteria: ["GIVEN agents/pm.md currently inlines the demand-assessment, scope-challenge, and risk-radar frameworks plus AC-drafting guidance, WHEN the extraction lands, THEN that content also moves to a reference file loaded on demand rather than shipping on every PM dispatch.", "GIVEN the frameworks have moved out, WHEN a PM dispatch drafts Given-When-Then ACs for a triaged FEAT, THEN AC quality is unchanged from before the extraction, spot-checked against a sample triage."]
  - id_suffix: -SLICE-3
    title: Verify pm.md headroom under cap; add an agent-file margin-warning check
    points: 1
    estimated_tokens: 60000
    acceptance_criteria: ["GIVEN both extractions land, WHEN agents/pm.md is measured against validate-content-length.mts, THEN it sits with real headroom under its cap rather than at or within a few lines of it.", "GIVEN any owned agent file's line count nears its content-length cap, WHEN validate-content-length.mts (or a sibling check) runs, THEN it emits an advance warning below the hard-fail threshold so the next editor gets notice before a CI failure rather than at it."]
p0_bucket: carry
p0_bucket_reason: "agents/pm.md content-length relief; pm is a runner-owned agent with no crew duplicate, ports into devcrew's agent map largely as-is"
---
## Description

agents/pm.md is at exactly 335/335 lines against its content-length override; the next edit of any size fails CI gate 3.

Found in review of SLICE-184 on 2026-08-04. The owned-agent cap is 300 lines (AGENTS.md style rules, enforced by validate-content-length.mts). agents/pm.md carries a per-file override that has already been raised twice: 300 to 325 to 335. It sat at 333/335 before SLICE-184, and SLICE-184's two-line final-act addition consumed the remaining headroom exactly. It now measures 335 lines against a 335 cap.

Consequence: any subsequent edit to agents/pm.md — including a one-line typo fix or a single clarifying sentence — fails validate-content-length and therefore CI gate 3, until someone either raises the override a third time or removes content. The failure will surface as a red CI on an unrelated PR whose author has no context on why a documentation cap is involved, which is the same class of friction as FEAT-286's flaky test: a gate failing for reasons the person tripping it did not cause.

The pattern is worth addressing rather than the instance. Raising the override each time it binds converts a design constraint into a ratchet, and the cap exists for a real reason — an agent prompt that keeps growing degrades in instruction-following, which is precisely the problem SLICE-184 was fixing when it needed those two lines.

Acceptance direction, in preference order. (a) Restructure agents/pm.md so it fits under a lower cap: the 5-dimension scoring rubric, the demand-assessment/scope-challenge/risk-radar frameworks, and the AC-drafting guidance are all candidates for extraction into a skill or a reference file the agent reads on demand rather than carrying inline on every dispatch — this also reduces per-dispatch token cost, since the full prompt ships with every PM invocation. (b) If extraction is not viable, raise the override once with a written rationale recorded alongside it, and add a check that warns when any agent file is within a small margin of its cap so the next person gets advance notice instead of a hard CI failure. Do not simply bump the number again with no note; that is what produced the current ratchet.

Related: SLICE-184 (which consumed the last headroom), FEAT-286 (the same class of gate-fails-for-unrelated-reasons friction).

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- GIVEN agents/pm.md currently inlines the 5-dimension scoring rubric, WHEN the extraction lands, THEN that rubric moves to a skill/reference file the PM agent reads on demand, reducing pm.md's line count correspondingly.
- GIVEN the rubric has moved out of pm.md, WHEN the PM is dispatched for /runner:triage, THEN it produces scores identical in structure and behavior to before the extraction — no regression to scoring output.
- GIVEN agents/pm.md currently inlines the demand-assessment, scope-challenge, and risk-radar frameworks plus AC-drafting guidance, WHEN the extraction lands, THEN that content also moves to a reference file loaded on demand rather than shipping on every PM dispatch.
- GIVEN the frameworks have moved out, WHEN a PM dispatch drafts Given-When-Then ACs for a triaged FEAT, THEN AC quality is unchanged from before the extraction, spot-checked against a sample triage.
- GIVEN both extractions land, WHEN agents/pm.md is measured against validate-content-length.mts, THEN it sits with real headroom under its cap rather than at or within a few lines of it.
- GIVEN any owned agent file's line count nears its content-length cap, WHEN validate-content-length.mts (or a sibling check) runs, THEN it emits an advance warning below the hard-fail threshold so the next editor gets notice before a CI failure rather than at it.

## Proposed slices (PM decomposition)

- SLICE-1: Extract PM 5-dimension scoring rubric from pm.md into a skill/reference (2 pts)
- SLICE-2: Extract demand/scope-challenge/risk-radar/AC-drafting frameworks from pm.md (2 pts)
- SLICE-3: Verify pm.md headroom under cap; add an agent-file margin-warning check (1 pts)
