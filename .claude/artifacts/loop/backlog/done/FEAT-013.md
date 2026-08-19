---
id: FEAT-013
status: done
priority: P2
category: feature
target_release: null
created: 2026-08-19
updated: 2026-08-19
depends_on: []
slices: [SLICE-34]
derived_from: null
pm_customer_impact: 0.45
pm_effort_estimate: 0.4
pm_strategic_alignment: 0.6
pm_technical_risk: 0.4
pm_dependency_depth: 0.2
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "New validator pattern in the repo but no schema/contract change and a clean single-file rollback; directly supports the actively-graded crew/ flatten program, so P2/autonomous-safe with no pre-mortem required (risk below 0.6, not P0/P1)."
tags: ["stack:typescript", "area:repo-boundary", "concern:crew-flatten"]
needs_contract: true
needs_ux: false
started_at: 2026-08-19
slices_complete: [SLICE-34]
completed_at: 2026-08-19
---
## Description

crew/ flatten phase 1 — boundary validator + hooks.json path map: add a root validator enforcing the root<->crew/ import boundary (today only convention + CI path strings guard it; the single sanctioned cross-import is hooks/pre-push-gate.mts -> 4 crew modules, allowlist it), and produce a machine-readable inventory of every ${CLAUDE_PLUGIN_ROOT}/crew/... path in .claude-plugin/hooks/hooks.json as the prerequisite map for the later hooks relocation.

## Intake notes

Created via free-text intake (`/devcrew:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/devcrew:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a source file outside crew/ that attempts to import a crew/-internal module not on the allowlist, When the root validator runs in CI, Then it fails with the offending file:line and the disallowed import path named.
- AC-2: Given hooks/pre-push-gate.mts importing from 4 crew modules, When the validator runs, Then those specific imports pass because they are on the sanctioned allowlist, and no other cross-import is silently permitted.
- AC-3: Given .claude-plugin/hooks/hooks.json, When the inventory scan runs, Then it produces a machine-readable list of every ${CLAUDE_PLUGIN_ROOT}/crew/... path referenced in that file, keyed by hook name.
- AC-4: Given the new validator is added to CI, When an existing, currently-passing build runs against it, Then it passes cleanly (no false-positive on any currently-sanctioned import pattern).
