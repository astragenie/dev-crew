---
id: FEAT-166
title: Per-repo cost attribution in regression check
status: pending
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
