---
id: FEAT-240
status: triaged
priority: P3
category: maintenance
target_release: null
created: 2026-07-08
updated: 2026-07-19
depends_on: []
slices: []
derived_from: null
tags: [be]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: 2026-07-19
triage_notes: "P3: very low customer_impact (pure internal bookkeeping) and low remaining effort after verifying 2 of 3 ACs are already substantively satisfied in the current codebase; technical_risk stays low (0.0-0.2 band) since remaining work is a version-pin-style check plus documentation, no code path change."
pm_customer_impact: 0.15
pm_effort_estimate: 0.15
pm_strategic_alignment: 0.3
pm_technical_risk: 0.15
pm_dependency_depth: 0.05
pm_composite_priority: P3
pm_autonomous_safe: true
---
## Description

The plugins-common stabilization milestone (candidate #3: astramem-client adoption in runner) is
~80% already shipped here — PR #362 delegates `memory-transport.mts` to `@astragenie/astramem-client`,
PR #380/DEC-072 retired the CLI-spawn fallback and the `--type` split. Two residual items remain,
both runner-plugin-local:

1. **Version pin bump.** `package.json` pins `@astragenie/astramem-client` at `0.1.0`. The package is
   now **0.2.0** (published from plugins-common) with a large new `AstramemDaemonClient` REST surface.
   Bump the pin (align with the exact-pin convention; note dev-team currently pins caret `^0.1.0`).
2. **DaemonClient adoption decision.** Decide (via DEC) whether runner consumes the new
   `AstramemDaemonClient` REST surface in 0.2.0 or stays on the `resolveWireProvider`/`rememberSilent`
   provider seam it already uses. If staying on the seam, record why; if adopting, scope the migration.

## Acceptance criteria
- AC-1: `package.json` pins `@astragenie/astramem-client` at `0.2.0` (or the agreed range); `bun install` + memory tests green.
- AC-2: A DEC records the AstramemDaemonClient adopt-vs-defer decision with rationale.
- AC-3: No remaining CLI-spawn memory paths (confirm DEC-072 cleanup is complete).

## Cross-repo note
Also relevant to the two runner loop-CLI bugs surfaced during the milestone: FEAT-238 (static astramem-client import in `memory-context.mts` crashes slice-start) and FEAT-239 (`slice close --grade-yaml` unparseable). Those are independent of this pin bump but share the memory subsystem.
