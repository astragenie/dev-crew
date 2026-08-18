---
id: FEAT-007
status: pending
priority: null
category: feature
target_release: null
created: 2026-08-18
updated: 2026-08-18
depends_on: []
slices: []
derived_from: null
---
## Description

Carried from runner-plugin FEAT-230 (task-driven skill selection, decommission presets as the skill source) after P0 parent-estate settlement. SLICE-195 (live crew skill catalog enumerator) already shipped in runner-plugin, evidenced at .claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md and src/scripts/lib/skill-catalog.mts. Remaining scope, re-framed for the merged repo where the crew<->runner seam this FEAT bridges no longer exists: build a task-signal (stack:*/concern:*/surface:*) to skill mapping/matcher table that resolves against the single merged skills/ tree (no more loop.crewRepoPath cross-plugin gating or skip-path posture), wire resolve-skills CLI (loop.mts resolve-skills, currently --variant fe|be|single preset-driven) to accept --slice/--tags with the old pickBlock path kept as fallback, add a resolve-time + CI fixture-snapshot validation gate so a resolved skill id absent from the live catalog fails loudly instead of silently no-oping (the original dead-ID defect: dotnet-only.json/dotnet-react.json/dotnet-typescript-vue.json referenced csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering, all removed when crew reorganized skills/domain/), and record a DEC for decommissioning preset.roles.*.skills/fe.skills/be.skills as the skill source. Carry a known correction forward: catalog enumeration must be recursive keyed on SKILL.md basename, not a flat top-level listing -- a flat lookup against crew's nested skills/domain tree produces false-negative 'missing' skills that are actually live but nested (see runner-plugin FEAT-230.md, 'Corrected drift measurement' section). Cross-plugin docs/upstream-request amendment work (the old SLICE-198) is largely moot post-merge and can be dropped from scope.

## Intake notes

Created via free-text intake (`/runner:intake "<text>"`). Priority is
unset — this FEAT has not been scored yet. Run `/runner:triage`
(PM scoring + `backlog pm-apply`) to score it before slicing.