---
id: FEAT-240
status: pending
priority: P2
category: maintenance
target_release: null
created: 2026-07-08
updated: 2026-07-08
depends_on: []
slices: []
derived_from: null
tags: [area:memory, concern:version-compat, area:astramem-client]
needs_contract: false
needs_ux: false
autonomous_safe: true
pm_reviewed: null
triage_notes: "Filed 2026-07-08 from the plugins-common stabilization milestone (companion to plugins-common FEAT-003, closed there as no-in-repo-deliverable). runner-plugin's astramem-client consumption is the residual of that milestone's candidate #3."
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
