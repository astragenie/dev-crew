---
id: FEAT-289
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-04
updated: 2026-08-04
depends_on: []
slices: []
derived_from: null
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