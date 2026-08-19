---
id: SLICE-43
title: Implement FEAT-008
status: completed
feature: FEAT-008
phase: null
priority: P2
target_release: null
requires_validation: true
risk: medium
created: 2026-08-19
updated: 2026-08-19
tags: ["stack:typescript"]
completed_at: 2026-08-19
---
# SLICE-43: Implement FEAT-008

Implements FEAT-008. See [feature file](../../../backlog/in-progress/FEAT-008.md) for product context.

## Objective

Carried from runner-plugin FEAT-259 (agent SendMessage report-back enforcement) after P0 parent-estate settlement. Three of five slices already shipped in runner-plugin: SLICE-187 (SubagentStop report-gate hook, hooks/report-gate.mjs, shipped default-off with a known prompt-text-proximity false-positive risk documented in FEAT-259.md), SLICE-184 (mandatory final-act SendMessage line across owned agent templates), and SLICE-185 (orchestrator-watchdog decision logic in src/scripts/lib/orchestrator-watchdog.mts, shipped deliberately UNWIRED -- no production caller exists because nothing scriptable in runner-plugin can observe a live subagent idle/stop state; parseChangedPaths there also has a disclosed gap on quoted/renamed git paths that must be hardened before any execution point is added). Remaining scope, cheaper to build once crew and runner share one dispatch loop than to keep coordinating across the seam: (1) the structured receipt schema ({status, items[], commit_shas[], evidence_path, deviations[]}, target <=15 lines) documented and adopted by dispatch prompt templates, and (2) idle-ping suppression -- swallow bare idle_notification pings emitted after a report was already delivered and acknowledged (measured at 100% recurrence, 6-of-6 and 9-of-9 in two separate runner-plugin sessions, distinct from FEAT-259's already-fixed missing-report case) -- wired into the dispatch loop's context-budget hygiene. Note the FEAT's own finding that shipped SLICE-184 and SLICE-187 are independent, not reinforcing: an owned agent's .md template content never reaches the transcript first turn that the report-gate hook scans, so the receipt-schema and idle-suppression work still needs its own real coverage, not just closure.

## In scope

- Typed `AgentReceipt` schema + validation (`src/scripts/lib/agent-receipt.mts`).
- SubagentStop-based receipt detection extending `hooks/report-gate.mjs`, writing a lane table (`.claude/state/loop/receipt-lane-table.json`) keyed by `agent_id`.
- Receipt-shape emit guidance added to the 7 owned dispatch templates' report/return sections.
- Tests: schema validation, transcript-scan detection, lane-table round trip, fail-soft paths.

## Out of scope

- TeammateIdle provocation spike (amended slice 3) and TeammateIdle-based suppression hook (amended slice 4) — deferred per the 2026-08-19 contract amendment; see AC-1/AC-3 notes below.
- Any change to `report-gate.mjs`'s existing block/approve decision logic.

## Acceptance criteria

Per the 2026-08-19 contract amendment (docs/planning/feat-008-receipt-schema-contract.md,
"## Amendment" section), this slice builds the amended slices 1-2 ONLY
(receipt schema + SubagentStop-based detection + lane table). Slices 3-4
(TeammateIdle provocation spike, TeammateIdle-based suppression hook) are
explicitly deferred to a follow-up, since the spike found TeammateIdle never
fires in this harness. AC-1 and AC-3 below depend on the deferred
idle-suppression hook and cannot be satisfied by this slice; they are marked
deferred, not done, rather than checked off against unbuilt code.

- [ ] AC-1: **DEFERRED per 2026-08-19 contract amendment** — depends on the TeammateIdle-based idle-ping suppression hook (amended slice 4), itself blocked on the amended slice-3 provocation spike (settings.json-masking test) proving TeammateIdle fires in this harness at all. Not in this slice's build scope. Given a dispatched subagent that has already sent a structured receipt ({status, items[], commit_shas[], evidence_path, deviations[]}) and it was acknowledged by the parent, When that subagent later emits a bare idle_notification ping, Then the dispatch loop suppresses it and does not re-inject it into the parent's context.
- [x] AC-2: Given a subagent template updated with the new receipt schema, When the subagent completes its work and sends its final report, Then the report is <=15 lines and contains status, items[], commit_shas[], evidence_path, and deviations[] fields in the documented shape. Satisfied: all 7 templates (aiplugin-dev, backend-dev, frontend-dev, fullstack-dev, market-researcher, pm, swarm) now require the receipt shape in their Final step/Final act section, pointing at the canonical schema `src/scripts/lib/agent-receipt.mts` (target <=15 lines documented in the 4 free-text templates).
- [ ] AC-3: **DEFERRED per 2026-08-19 contract amendment** — as literally written this AC is about the (unbuilt) idle-ping suppression hook staying distinct from report-gate.mjs's existing missing-report block behavior; that suppression hook does not exist in this slice. The analogous distinctness requirement WAS built and tested for what this slice does ship: report-gate.mjs's new receipt/lane-table side effect is observably distinct from its existing block/approve gate (src/tests/report-gate.test.mts, "receipt detection + lane table" describe block, e.g. "no SendMessage at all ... -> lane table stays empty, block still fires"). Given a subagent that stops WITHOUT ever having sent a structured receipt (the already-fixed missing-report case from SLICE-187), When SubagentStop fires, Then idle-ping suppression does not swallow that stop event -- it must remain distinct from, not a regression of, the report-gate hook's existing behavior.
- [x] AC-4: Given the receipt-schema and idle-suppression code paths, When a test asserts on an agent .md template's static content alone, Then it is treated as insufficient coverage (per the FEAT's own reinforcement-vs-independence finding) -- the AC set must include at least one test that exercises the live transcript-scanning/dispatch-loop path, not template content alone. Satisfied: src/tests/report-gate.test.mts spawns the real hooks/report-gate.mjs process against fixture transcript JSONL and asserts on the resulting lane-table file on disk, not on any agent .md content.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-008 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
