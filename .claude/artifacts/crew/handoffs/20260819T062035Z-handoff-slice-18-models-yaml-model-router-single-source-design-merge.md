# Task Handoff: SLICE-18: models.yaml/model-router single-source design merge

- Created: 2026-08-19T06:20:35.183Z
- From: fullstack-dev
- To: lead
- Objective: Scoped-down from the literal task after investigation. crew/models.yaml is already the single source for its two real consumers (apply-model-profile.mts, evals/model-profile.mts) -- no relocation needed; validate-configs.mts already documents (line 44) that models.yaml deliberately stays under crew/ REPO_ROOT, not the monorepo root, per resolve-token.mts's TokenResolverRoots split. The literal keep-in-sync pair the unification-plan bullet actually points at is src/scripts/lib/model-router.mts (runner side) vs crew/scripts/lib/models/resolve-model.mts (crew side) -- both explicitly say keep-in-sync in their comments. A full file merge of that pair is unsafe within this slice: crew/hooks/pre-tool-use-model-enforce.mts and crew/hooks/lib/model-routing-enforce.mts import resolve-model.mjs directly (forbidden hooks/ zone, reserved for SLICE-17), and crew/ is still a fully separate npm/tsc project (own tsconfig.json with a scoped include list, own package.json/deps, own TS 6.0.3 vs root TS 7.0.0, tests run via cd crew) so importing model-router.mts across that boundary risks silently breaking crew's own tsc gate ahead of the larger crew-to-root absorption program other parallel slices are already running. Delivered instead: a real, safe, single-source-of-truth fix within crew/models.yaml's system -- found and fixed an actual undetected divergence where evals/lib/model-profile.mts's hand-rolled validateModelsConfig accepted any string as version while scripts/lib/models/schema.mts's Zod ModelsConfigSchema requires MAJOR.MINOR.PATCH; tightened the hand-rolled check to match, and added crew/tests/model-profile-schema-parity.test.mts (11 fixture cases) asserting the two validators agree on every case, closing the silent-drift gap that model-tiers-parity.test.mts left uncovered (it only guarded the tier-NAME list, not the full validation contract).
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/evals/lib/model-profile.mts
  - crew/tests/model-profile-schema-parity.test.mts
- Confidence: medium
- Risks: The larger model-router.mts/resolve-model.mts merge (the pairing the unification-plan bullet literally names) is still open and remains real drift risk -- recommend a dedicated follow-up slice scoped to run AFTER crew/ is absorbed into the monorepo root (so hooks/ and tsc-project boundaries are no longer split), or alternatively scoped explicitly to include hooks/ edits and assigned after SLICE-17 completes.
- Suggested Next Handoff: Follow-up slice: once crew/hooks/* and crew/scripts/lib/models/resolve-model.mts share a package/tsc project with src/scripts/lib/model-router.mts, delete resolve-model.mts and repoint crew.mts + both hook files at the canonical model-router.mts (generalizing resolveWaveDispatchModel into a resolveDispatchModel(phase, shape, config, routingEnabled) export first, verified against both existing test suites for behavioral equivalence).

