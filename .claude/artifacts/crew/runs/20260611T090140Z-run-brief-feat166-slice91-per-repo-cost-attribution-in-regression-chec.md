---
feature: FEAT-166
status: active
---
# Run Brief: FEAT166 SLICE91: Per-repo cost attribution in regression check

- Created: 2026-06-11T09:01:40.478Z
- Tier: full
- Goal: `cost-regression.mjs` reads `fm.usd` from aggregate reports without filtering by source project. When parallel work runs in adjacent projects (loop + hero-crew + loopobserver) during the same time window, the aggregate USD inflates and trips the regression gate against the project under inspection.
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `scripts/lib/cost-alert-loader.mjs::parseAggregateReportFile` returns a `perProjectUsd: Record<string
  - number> | null` field parsed defensively from aggregate cost-report frontmatter.
- `scripts/lib/cost-regression.mjs::checkCostRegression` filters cost samples by `config.loop.costProject` (and `costProjectAliases`) when `perProjectUsd` is present
  - comparing the project's slice of USD against its own rolling median.
- Back-compat fallback: when `perProjectUsd` is missing from a report
  - behaviour is unchanged — compare `fm.usd` against rolling median as today.
- Tests covering the three branches: (a) map present
  - current project's slice hits threshold; (b) map present
  - current project safe but other projects over; (c) map absent
  - back-compat path uses `fm.usd`.
- Out Of Scope:
  - - hero-crew SLICE-1 (upstream emit of `per_project_usd` in aggregate writer) — separate cross-plugin slice tracked under FEAT-166 body.
- Backfilling per-project map into historical aggregate reports.
- FEAT-165 per-skill cost attribution (separate FEAT).
- Planned Files: -
- Next Step: Begin implementation

