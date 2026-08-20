---
id: FEAT-017
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-20
depends_on: []
slices: [SLICE-45]
derived_from: null
pm_customer_impact: 0.4
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.6
pm_technical_risk: 0.3
pm_dependency_depth: 0.65
pm_composite_priority: P2
pm_autonomous_safe: false
pm_reviewed: 2026-08-19
autonomous_safe: false
triage_notes: "Trivial code change but genuinely blocked on an external, time-based release gate (FEAT-019 shipping plus one full release cycle) that is not expressible in frontmatter depends_on -- dependency_depth is scored at 0.65 to reflect that real gate, which forces autonomousSafe:false so the loop does not grab this low-effort P2 item prematurely and hard-fail legacy-token consumers ahead of schedule."
tags: ["stack:typescript", "area:dispatch-routing", "concern:deprecation-cutover"]
needs_contract: false
needs_ux: false
started_at: 2026-08-20
slices_complete: [SLICE-45]
completed_at: 2026-08-20
---
## Description

Empty the legacy dispatch allowlist in guard-feat-dispatch: the allowlist of legacy /crew: and /runner: dispatch tokens was kept functional through the cutover; one release after devcrew 1.0.0 goes live, empty it so legacy tokens hard-fail, and update its tests accordingly.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given devcrew v1.0.0 has shipped AND one full release cycle has elapsed since, When this FEAT is picked up, Then the legacy /crew: and /runner: allowlist in guard-feat-dispatch is emptied.
- AC-2: Given the allowlist is emptied, When a dispatch prompt uses a legacy /crew: or /runner: token, Then guard-feat-dispatch hard-fails it instead of silently permitting it through the (now-empty) allowlist.
- AC-3: Given the existing guard-feat-dispatch-hook.test.mts suite currently asserts on allowlisted legacy-token behavior, When the allowlist is emptied, Then those tests are updated to assert the new hard-fail behavior instead of the old pass-through behavior.
- AC-4: Given this FEAT is scored before devcrew 1.0.0 has shipped, When it reaches the autonomous loop's dispatch queue, Then it is NOT auto-dispatched until a human confirms the 1.0.0-plus-one-release timing gate has actually elapsed.
