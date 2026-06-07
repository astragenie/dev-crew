---
id: FEAT-074
status: pending
priority: P3
category: null
target_release: v0.27.0
created: 2026-06-07
updated: 2026-06-07
depends_on: []
slices: []
derived_from: null
---
# FEAT-074: noUncheckedIndexedAccess — B5 tsconfig tighten

Enable strictest TypeScript index-signature safety flag.\n\n## Context\n\nDeferred from SLICE-74 (DEC-027 escape-hatch triggered). Dry-run showed 80+ errors across codebase. Requires systematic audit of array/object index access patterns before enabling.\n\n## Acceptance Criteria\n\n- tsconfig.json: noUncheckedIndexedAccess: true\n- All errors resolved (no suppressions)\n- npm run typecheck exits 0\n- npm test passes\n- npm run lint exits 0 warnings