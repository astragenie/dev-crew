---
id: FEAT-269
status: in-progress
priority: P3
category: feature
target_release: null
created: 2026-08-02
updated: 2026-08-02
depends_on: []
slices: [SLICE-165]
derived_from: null
tags: [be, test]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.25
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.25
pm_technical_risk: 0.1
pm_dependency_depth: 0.1
pm_composite_priority: P3
pm_autonomous_safe: true
pm_reviewed: 2026-08-02
autonomous_safe: true
triage_notes: "P3: mostly already implemented (filter + mixed-corpus test both landed 2026-07-18) -- only the 'report aggregate count separately' line remains, a trivial single-file addition; technical_risk at 0.1 (known pattern, 1 file, trivially reverted)."
proposed_slices:
  - id_suffix: -SLICE-1
    title: Surface excluded-aggregate count in loop-snapshot telemetry
    points: 2
    estimated_tokens: 100000
started_at: 2026-08-02
github_issue: 561
github_milestone: null
github_url: "https://github.com/astragenie/runner-plugin/issues/561"
---
## Description

Exclude aggregate_all cost reports from per-slice cost statistics. Fleet audit 2026-08-02: aggregate reports (source_project: aggregate / aggregate_all: true) are mixed unmarked into per-repo cost stats — runner 142/313 reports, dev-team 81/218, authentic 64/67; one $32,101 fleet-wide aggregate (source_count 107) was mistaken for a single dev-team slice report and is exactly why loop-snapshot shows median $31.99 vs mean $936.11. Fix: memory-snapshot.mts cost trajectory (via cost-report-dedup.mts loader) must filter aggregate_all: true; snapshot should report the aggregate count separately. Add a test with a mixed corpus.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a cost-report corpus containing both normal and aggregate_all: true reports, When the loop snapshot renders the telemetry section, Then it additionally reports the count of aggregate reports excluded from the trajectory (e.g. "N aggregate reports excluded").
- AC-2: Given zero aggregate reports in the window, When rendered, Then the aggregate-count line is omitted or shows 0 without changing existing trajectory output.
- AC-3: Given the existing test at src/tests/memory-snapshot-telemetry.test.mts:116, When extended, Then it asserts the new aggregate-count line's value matches the number of aggregate_all: true fixtures written.
- AC-4: Given the existing aggregate_all exclusion in resolveCostReportUsd (memory-snapshot.mts:132), When this FEAT is picked, Then the builder does not re-implement it -- only adds the count-surfacing output.

## Proposed slices (PM decomposition)

- SLICE-1: Surface excluded-aggregate count in loop-snapshot telemetry (2 pts)
