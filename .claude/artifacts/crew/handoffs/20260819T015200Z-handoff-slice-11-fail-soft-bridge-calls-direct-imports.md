# Task Handoff: SLICE-11: fail-soft bridge calls -> direct imports

- Created: 2026-08-19T01:52:00.532Z
- From: fullstack-dev
- To: lead
- Objective: Replaced crew-bridge.mts's four fail-soft execFile calls (write-run-brief, cost-slice, cost-advise, mark-badge) with direct in-process imports of crew/scripts/lib functions. Extracted writeCostAdviseArtifact into a new exported module crew/scripts/lib/cost-hygiene/cost-advise-writer.mts (crew.mts now imports it too). Dropped rootDir from tsconfig.json + tsconfig.test.json per contract finding 1. Deleted findHeroCrewCli/HERO_CREW_PATH/runCrew/pushOptionalFlags/appendFeaturePhaseArgs from crew-bridge.mts (dead once execFile is gone); kept appendSourceProjectArgs (still exported+unit-tested, just unused internally now). Found and fixed two contract gaps not in the original doc: (1) the specifier depth was three ../ in the contract text but needed four (fixed + noted in contract); (2) tsconfig.test.json's strictNullChecks:false breaks Result<T,E> discriminated-union narrowing on !r.ok once crew files enter the same tsc program -- fixed by switching to r.ok === false (narrows correctly regardless of strictNullChecks) across crew-bridge.mts and the pre-existing cost-slice-handler.mts idiom, plus one WorkflowRun-to-Record cast needing an unknown intermediate. Rewrote two tests (cost-project-slugify.test.mts, cost-scan-window-regression.test.mts AC-1) off the now-defunct HERO_CREW_PATH fake-CLI-subprocess seam onto the real direct-import path, asserting on result.cost.sourceProject/window instead of fake argv.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/slice-linker/crew-bridge.mts
  - tsconfig.json
  - tsconfig.test.json
  - crew/scripts/lib/cost-hygiene/cost-advise-writer.mts
  - crew/scripts/crew.mts
  - crew/scripts/lib/cost-hygiene/cost-slice-handler.mts
  - src/tests/cost-project-slugify.test.mts
  - src/tests/cost-scan-window-regression.test.mts
  - docs/planning/p2-seam-contract.md
- Confidence: high
- Risks: SLICE-12/13 will hit the same strictNullChecks narrowing wall (!result.ok idiom) the first time they cross-tree-import a Result-returning crew function -- flagged in the contract addendum so it isn't rediscovered. cost-advise artifact 'kind' resolution: confirmed there is NO 'cost-advise' entry in write.mts's SIMPLE_RENDERERS or artifact-schemas.mts -- writeCostAdviseArtifact is correctly a standalone writer (not routed through writeArtifact), matching the contract's fallback branch.
- Suggested Next Handoff: SLICE-12: write-validation-result fail-hard direct import + phase-gate call-site updates. Watch for the same strictNullChecks narrowing issue on the extracted ValidationArtifactSchema/resolveValidationVerdict module.

