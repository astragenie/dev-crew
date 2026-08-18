---
id: FEAT-008
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-259 (agent SendMessage report-back enforcement) after P0 parent-estate settlement. Three of five slices already shipped in runner-plugin: SLICE-187 (SubagentStop report-gate hook, hooks/report-gate.mjs, shipped default-off with a known prompt-text-proximity false-positive risk documented in FEAT-259.md), SLICE-184 (mandatory final-act SendMessage line across owned agent templates), and SLICE-185 (orchestrator-watchdog decision logic in src/scripts/lib/orchestrator-watchdog.mts, shipped deliberately UNWIRED -- no production caller exists because nothing scriptable in runner-plugin can observe a live subagent idle/stop state; parseChangedPaths there also has a disclosed gap on quoted/renamed git paths that must be hardened before any execution point is added). Remaining scope, cheaper to build once crew and runner share one dispatch loop than to keep coordinating across the seam: (1) the structured receipt schema ({status, items[], commit_shas[], evidence_path, deviations[]}, target <=15 lines) documented and adopted by dispatch prompt templates, and (2) idle-ping suppression -- swallow bare idle_notification pings emitted after a report was already delivered and acknowledged (measured at 100% recurrence, 6-of-6 and 9-of-9 in two separate runner-plugin sessions, distinct from FEAT-259's already-fixed missing-report case) -- wired into the dispatch loop's context-budget hygiene. Note the FEAT's own finding that shipped SLICE-184 and SLICE-187 are independent, not reinforcing: an owned agent's .md template content never reaches the transcript first turn that the report-gate hook scans, so the receipt-schema and idle-suppression work still needs its own real coverage, not just closure.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.