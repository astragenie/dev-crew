---
id: FEAT-166
title: Per-repo cost attribution in regression check
status: triaged
priority: P1
category: bug/observability
target_release: null
created: 2026-06-09
updated: 2026-06-09
depends_on: []
slices: []
derived_from: null
source_competitors: []
autonomous_safe: false
tags: [crew, cost, observability, bug]
needs_contract: true
needs_ux: false
pm_customer_impact: 0.75
pm_effort_estimate: 0.35
pm_strategic_alignment: 0.8
pm_technical_risk: 0.5
pm_dependency_depth: 0.45
composite_score: 0.71
triage_notes: "High-impact bug fix, confirmed false-trip evidence (2026-06-09). Risk band 0.3-0.5: isolated module logic, additive frontmatter field, clean rollback. Cost analog SLICE-83 (USD 41.39) confirms effort 0.35. Weak dimension observability 0.66: AC must add parse/filter logging. Cross-plugin contract coordination with hero-crew blocks autonomous run."
github_issue: 189
github_milestone: null
github_url: "https://github.com/sergeymilashico/loop/issues/189"
---
# FEAT-166: Per-repo cost attribution in regression check

## Problem

`cost-regression.mjs` reads `fm.usd` from aggregate reports without filtering by source project. When parallel work runs in adjacent projects (loop + hero-crew + loopobserver) during the same time window, the aggregate USD inflates and trips the regression gate against the project under inspection.

**Confirmed example** (2026-06-09): a $100.19 aggregate alert was actually loop $50 + hero-crew $43 + loopobserver $6.68. Loop's project spend was normal.

**Root cause:** aggregate cost reports list per-project breakdown in the body (`Sources (aggregated)` block) but expose only the summed `usd` in frontmatter. The regression consumer in loop has no way to read the per-project rollup without parsing the body.

## Proposal

Two-step fix spanning two plugins:

### SLICE-1 (hero-crew, upstream PR)

Aggregate cost-report writer emits a frontmatter map alongside the existing `usd` field:

```yaml
per_project_usd:
  C--work-mega-loop: 16.0366
  C--work-mega-hero-crew: 25.3521
```

Keep `usd` (sum) for backward compatibility.

### SLICE-2 (loop)

`scripts/lib/cost-alert-loader.mjs::parseAggregateReportFile` returns the map. `cost-regression.mjs::checkCostRegression` filters by `config.loop.costProject` (already declared, currently unused for filtering). Falls back to `fm.usd` when `per_project_usd` is missing (old reports).

## Acceptance criteria

- `per_project_usd` field present in every new aggregate cost report (hero-crew side).
- Regression check ignores cross-project USD and compares only `per_project_usd[costProject]` vs project's own rolling median.
- Existing tests + new tests covering: (a) map present, current project hit; (b) map present, current project safe but others over; (c) map absent (back-compat path uses `fm.usd`).
- Loop-snapshot regenerated to confirm cost trajectory now reflects loop-only spend.

## Out of scope

- Backfilling per-project map into historical aggregate reports.
- FEAT-165 per-skill cost attribution (separate FEAT; this work unblocks it).

## Source

User-reported false-trip 2026-06-09. Spec under design: `docs/superpowers/specs/2026-06-09-feat166-per-repo-cost-attribution-design.md` (TBD when slice opens).

## Related

- `[[FEAT-165]]` (per-skill cost attribution; shares telemetry surface).
- `[[FEAT-167]]` (story-point cost gate; uses the per-project USD as input to its expected-cost formula).
- `[[FEAT-133]]` (budget enforcement; consumes the corrected per-project signal).
