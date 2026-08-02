---
id: SLICE-165
title: Surface excluded-aggregate count in loop-snapshot telemetry
status: pending
feature: FEAT-269
phase: null
priority: P3
target_release: null
requires_validation: true
risk: low
created: 2026-08-02
updated: 2026-08-02
effort_points: 2
estimated_tokens: 100000
github_issue: 562
github_url: "https://github.com/astragenie/runner-plugin/issues/562"
---
# SLICE-165: Surface excluded-aggregate count in loop-snapshot telemetry

Implements FEAT-269. See [feature file](../../../backlog/in-progress/FEAT-269.md) for product context.

## Objective

Exclude aggregate_all cost reports from per-slice cost statistics. Fleet audit 2026-08-02: aggregate reports (source_project: aggregate / aggregate_all: true) are mixed unmarked into per-repo cost stats — runner 142/313 reports, dev-team 81/218, authentic 64/67; one $32,101 fleet-wide aggregate (source_count 107) was mistaken for a single dev-team slice report and is exactly why loop-snapshot shows median $31.99 vs mean $936.11. Fix: memory-snapshot.mts cost trajectory (via cost-report-dedup.mts loader) must filter aggregate_all: true; snapshot should report the aggregate count separately. Add a test with a mixed corpus.

## In scope

- bullet 1
- bullet 2

## Out of scope

- bullet 1

## Acceptance criteria

- [ ] AC-1: Given a cost-report corpus containing both normal and aggregate_all: true reports, When the loop snapshot renders the telemetry section, Then it additionally reports the count of aggregate reports excluded from the trajectory (e.g. "N aggregate reports excluded").
- [ ] AC-2: Given zero aggregate reports in the window, When rendered, Then the aggregate-count line is omitted or shows 0 without changing existing trajectory output.
- [ ] AC-3: Given the existing test at src/tests/memory-snapshot-telemetry.test.mts:116, When extended, Then it asserts the new aggregate-count line's value matches the number of aggregate_all: true fixtures written.
- [ ] AC-4: Given the existing aggregate_all exclusion in resolveCostReportUsd (memory-snapshot.mts:132), When this FEAT is picked, Then the builder does not re-implement it -- only adds the count-surfacing output.

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- build / test commands per `.claude/loop.json` pass
- feature FEAT-269 moved from `in-progress/` to `done/`
- Crew `final-synthesis` artifact written
- (pure refactors / mechanical changes: set `requires_validation: false` in frontmatter
   above to waive the validation gate — no badge needed at close time)

## Reviewer ladder

- Reviewer A: ...
- Reviewer B: ...
