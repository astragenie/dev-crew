---
id: FEAT-007
status: triaged
priority: P2
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-19
depends_on: []
slices: []
derived_from: null
pm_customer_impact: 0.55
pm_effort_estimate: 0.5
pm_strategic_alignment: 0.65
pm_technical_risk: 0.4
pm_dependency_depth: 0.15
pm_composite_priority: P2
pm_autonomous_safe: true
pm_reviewed: 2026-08-19
autonomous_safe: true
triage_notes: "Real, evidenced correctness defect (dead skill ids silently no-op) with meaningfully reduced scope now that the cross-plugin seam is gone; bounded to one module area with a known-pattern matcher/CLI/validator shape, so P2/autonomous-safe with no cost analog beyond the general SLICE-24 validator-hardening pattern ($26, avg 0.924)."
tags: ["stack:typescript", "area:skill-catalog", "concern:skill-resolution"]
needs_contract: true
needs_ux: false
---
## Description

Carried from runner-plugin FEAT-230 (task-driven skill selection, decommission presets as the skill source) after P0 parent-estate settlement. SLICE-195 (live crew skill catalog enumerator) already shipped in runner-plugin, evidenced at .claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md and src/scripts/lib/skill-catalog.mts. Remaining scope, re-framed for the merged repo where the crew<->runner seam this FEAT bridges no longer exists: build a task-signal (stack:*/concern:*/surface:*) to skill mapping/matcher table that resolves against the single merged skills/ tree (no more loop.crewRepoPath cross-plugin gating or skip-path posture), wire resolve-skills CLI (loop.mts resolve-skills, currently --variant fe|be|single preset-driven) to accept --slice/--tags with the old pickBlock path kept as fallback, add a resolve-time + CI fixture-snapshot validation gate so a resolved skill id absent from the live catalog fails loudly instead of silently no-oping (the original dead-ID defect: dotnet-only.json/dotnet-react.json/dotnet-typescript-vue.json referenced csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering, all removed when crew reorganized skills/domain/), and record a DEC for decommissioning preset.roles.*.skills/fe.skills/be.skills as the skill source. Carry a known correction forward: catalog enumeration must be recursive keyed on SKILL.md basename, not a flat top-level listing -- a flat lookup against crew's nested skills/domain tree produces false-negative 'missing' skills that are actually live but nested (see runner-plugin FEAT-230.md, 'Corrected drift measurement' section). Cross-plugin docs/upstream-request amendment work (the old SLICE-198) is largely moot post-merge and can be dropped from scope.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.
## Acceptance criteria (Given-When-Then)

- AC-1: Given a task-signal tuple derived from a FEAT's stack:/concern:/surface: tags, When resolve-skills is invoked with --slice or --tags, Then the matcher returns the recursively-enumerated skill ids (keyed on SKILL.md basename, including nested skills/domain/* entries) that match the tags, falling back to the legacy pickBlock preset path only when no tag match exists.
- AC-2: Given a resolved skill id that is not present in the live catalog enumeration, When resolve-skills runs (interactively or in CI via the fixture-snapshot check), Then the command fails loudly with the offending skill id named in the error, rather than silently omitting it from the resolved set.
- AC-3: Given the dotnet-only.json / dotnet-react.json / dotnet-typescript-vue.json presets referencing csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering, When the new CI fixture-snapshot validation gate runs, Then it fails on the currently-dead ids (regression-proving the original defect is caught) until those presets are corrected or the DEC decommissions preset-driven resolution.
- AC-4: Given a DEC drafted for decommissioning preset.roles.*.skills/fe.skills/be.skills as the skill source, When it is filed under .claude/artifacts/loop/decisions/, Then it documents the task-signal matcher as the replacement mechanism and the migration/compat posture for any --variant fe|be|single callers still in use.
