---
id: FEAT-204
status: triaged
priority: P1
category: bug
target_release: null
created: 2026-07-02
updated: 2026-07-02
depends_on: []
slices: []
derived_from: docs/research/2026-07-02-architecture-retrospective.md
tags: [telemetry, cost-control, bug]
needs_contract: false
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.75
pm_technical_risk: 0.4
pm_dependency_depth: 0.1
pm_composite_priority: P1
pm_autonomous_safe: true
pm_reviewed: 2026-07-02
autonomous_safe: true
triage_notes: "via=pm (2026-07-02 retrospective intake). Technical risk band 0.3-0.5 (new frontmatter field shared_with: = additive data-shape change, no contract break, cross-module reach between crew-bridge.mts and memory-snapshot.mts, clean rollback). P1: verified-real ~5x telemetry corruption feeding cost-advisor and stop-threshold decisions, top-10 rank #1, quick-win effort, zero dependencies."
---
# FEAT-204: Wave-mode cost report deduplication

## Problem

Per-FEAT cost reports inside a wave each record the full shared session
cost. The top-20 window contains byte-identical reports
(`20260613T092251Z-...feat180-slice115.md` vs `...092249Z...feat165-slice115.md`,
$3.846 / 7,909,088 tok each) and a ~$142.8 opus triplicate for
FEAT-112/SLICE-115. The snapshot's "$34.514/iteration" headline is ~5x
inflated (dedup avg $22.12; excluding the outlier $7.03). Cost-advisor
verdicts and stop thresholds consume corrupted input.

## Acceptance hints

- One cost report per session/worktree; sibling FEATs reference it
  (`shared_with:` or proportional split), never copy it.
- `memory-snapshot.mts` cost averaging dedups by session id.
- Regression test on the SLICE-115 wave fixture: 1 report + N references.

## Evidence

- Retrospective §0.1, F-01 / ADR-A;
  `src/scripts/lib/slice-linker/crew-bridge.mts:53-58`;
  `src/scripts/lib/memory-snapshot.mts:45-83`.

## Acceptance criteria (Given-When-Then)

- AC-1: Given a wave dispatch that spawns a shared session for FEAT-180 and FEAT-165 under SLICE-115, When crew write-final-synthesis (via src/scripts/lib/slice-linker/crew-bridge.mts) emits the cost report for that session, Then exactly one cost-report file is written under .claude/artifacts/crew/cost/, and the sibling FEAT's report references it via a shared_with: FEAT-XXX frontmatter field instead of duplicating the full usd/total_tokens payload.
- AC-2: Given the top-20 cost-report window contains a report and its shared_with reference for the same session, When loadCostReportUSDValues in src/scripts/lib/memory-snapshot.mts:45-83 computes the per-iteration cost trajectory, Then the referenced report's usd value is counted at most once toward the average, not summed once per sibling FEAT label.
- AC-3: Given a cost-report file whose shared_with field points to a session id with no corresponding primary report on disk (orphaned reference -- primary report rotated out of the top-20 window), When the snapshot averaging runs, Then it falls back to counting the orphaned report's own usd value rather than throwing, and the fallback is distinguishable in logs/output from a true duplicate.
- AC-4: Given a fixture reproducing the SLICE-115 wave shape (2 sibling FEAT reports pointing at 1 shared session, mirroring the historical byte-identical 20260613T092251Z/092249Z pair), When the dedup regression test runs, Then it asserts exactly 1 report contributes cost and N reports are recorded as references, and the computed average matches the deduplicated total.
