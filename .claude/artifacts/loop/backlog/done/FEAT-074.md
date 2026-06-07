---
id: FEAT-074
status: done
priority: P3
category: feature
target_release: v0.27.0
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: [SLICE-77]
derived_from: null
pm_customer_impact: 0.5
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.5
pm_technical_risk: 0.5
pm_dependency_depth: 0.5
autonomous_safe: false
triage_notes: "category inferred as feature from body content; autonomous_safe inferred: AC count=0, derived_from=null → false"
started_at: 2026-06-07
slices_complete: [SLICE-77]
completed_at: 2026-06-07
---
# FEAT-074: noUncheckedIndexedAccess — B5 tsconfig tighten

Enable strictest TypeScript index-signature safety flag.\n\n## Context\n\nDeferred from SLICE-74 (DEC-027 escape-hatch triggered). Dry-run showed 80+ errors across codebase. Requires systematic audit of array/object index access patterns before enabling.\n\n## Acceptance Criteria\n\n- tsconfig.json: noUncheckedIndexedAccess: true\n- All errors resolved (no suppressions)\n- npm run typecheck exits 0\n- npm test passes\n- npm run lint exits 0 warnings