---
id: SLICE-187
title: "SubagentStop report-gate hook, registered into existing hooks.json array"
status: completed
feature: FEAT-259
phase: null
priority: P1
target_release: null
requires_validation: true
risk: medium
created: 2026-08-04
updated: 2026-08-04
effort_points: 1
estimated_tokens: 80000
github_issue: 598
github_url: "https://github.com/astragenie/runner-plugin/issues/598"
touches_files: [hooks/report-gate.mjs, .claude-plugin/hooks/hooks.json, src/tests/report-gate.test.mts]
completed_at: 2026-08-04
---
# SLICE-187: SubagentStop report-gate hook, registered into existing hooks.json array

Implements FEAT-259. See [feature file](../../../backlog/in-progress/FEAT-259.md) for product context.

## Objective

Observed failure pattern (2026-07-09 wave run, 5 dispatched lane agents + 5 reviewers):

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC1: Given a dispatched agent with a report-back contract that attempts to stop without
- [ ] AC2: Given an agent without a report-back contract, when it stops, the hook approves
- [ ] AC3: Plugin-generated dispatch agent templates contain the mandatory final-act line
- [ ] AC4: Watchdog: idle-without-report triggers exactly one auto-nudge; a second silent idle
- [ ] AC5: Receipt schema documented + adopted by the plugin's dispatch prompt templates;

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-259 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
