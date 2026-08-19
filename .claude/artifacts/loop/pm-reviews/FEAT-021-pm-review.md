---
id: PM-REVIEW-FEAT-021
feature: FEAT-021
reviewed_at: 2026-08-19
pm_customer_impact: 0.2
pm_effort_estimate: 0.2
pm_strategic_alignment: 0.3
pm_technical_risk: 0.2
pm_dependency_depth: 0.1
composite_priority: P2
autonomous_safe: true
---
# PM Review — FEAT-021

## Demand Assessment

- **Evidence:** Checked live usage across the sole operator's full estate under C:\work\mega (~45 sibling directories, every repo present): grepped every .claude/loop.json and .claude/devcrew.json for the literal string 'dotnet-typescript-vue' and separately for any case-insensitive 'vue' reference at all. Zero matches, either way. Presets actually in active use across the estate: dotnet-react (7 repos: astra-render-wt-unify, authentic, memory, memory-wt-*, runner, runner-wt-p3, sales, sales-wt-unify), dotnet-aspire-python (7: citylive, common, common-wt-*, dating, devops, marketing), typescript-plugin-dev (10+: astramem-local, astramemory-local, dev-team, devcrew, hr-team, kb, plugins-common, runner-plugin, standards, v2-loop), dotnet-only (1: astra-render), dotnet-python (1: prism). dotnet-typescript-vue has zero adopters, current or apparent-historical.

## Scope Challenge

- **Scope notes:** PM scope-challenge call, made with the evidence above rather than left as an open decision: DEPRECATE the dotnet-typescript-vue preset rather than author a new vue-engineering skill. Authoring a real skill mirroring react-engineering's shape is genuine effort spent on a stack with zero current consumers anywhere in this estate -- per Framework 1, that is a demand_evidence:'none' case, which caps the author-a-skill path's customer_impact at <=0.3 on its own merits; deprecation carries the same low impact but at a fraction of the effort. If Vue demand ever materializes (a new adopter repo actually needs it), re-open authoring as a fresh, evidence-backed FEAT at that time rather than pre-building speculative skill content now. Smallest deliverable for deprecation: remove (or hard-error) the dotnet-typescript-vue preset option, update src/tests/preset-skill-ids.test.mts fixtures to drop the reference, and document the removal in CHANGELOG.md as a hard-break with no shim, consistent with this program's stated cutover posture (no silent aliasing).

## Scores

- customer_impact: 0.20
- effort_estimate: 0.20
- strategic_alignment: 0.30
- technical_risk: 0.20
- dependency_depth: 0.10

## Priority Derivation

composite_priority: P2
autonomous_safe: true
reasoning: Concrete, source-verified demand check across every adopter repo in the sole operator's estate shows zero live or historical consumers of dotnet-typescript-vue -- this drives the recommendation to deprecate the preset rather than author a new skill, which Framework 1 would otherwise flag as speculative investment. All five dimensions score low given the small, low-risk, low-value nature of a clean deprecation; lands at the formula's default P2 band (the same treatment given to FEAT-012's trivial cleanup last round) despite being intuitively a low-priority hygiene item, not an urgent one.

## Risks

- none
