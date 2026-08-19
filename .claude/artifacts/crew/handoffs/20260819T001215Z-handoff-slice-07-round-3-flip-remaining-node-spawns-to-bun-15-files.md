# Task Handoff: SLICE-07 round 3: flip remaining node spawns to bun (15 files)

- Created: 2026-08-19T00:12:15.088Z
- From: fullstack-dev
- To: lead
- Objective: Flipped the last node-spawn class to bun per the unification plan Sec3. In 14 crew/tests/*.test.mts files, changed every spawn/execFile/spawnSync/execFileSync of literal node (with or without --experimental-strip-types) targeting a repo .mts script to bun, dropping the strip-types flag; also dropped the stale --experimental-strip-types flag from 3 files (artifact-stub-and-update, tier-in-run-brief, crew-write-review-result) that use spawnSync(process.execPath, ...) -- process.execPath already resolves to the running bun binary under bun test, it was just carrying an incompatible node-only flag. Updated 2 ADR-002 comments (gepa-corpus-optimize, gepa-corpus-sync) to cite the unification plan instead. In crew/package.json flipped node ./scripts/*.mts invocations (validate:*, installer:*, e2e:smoke*, test:shard, verify:all, validate:all, validate:bundles) to bun, dropping strip-types. Left test:node and evals:view untouched (not node-./scripts/*.mts-script invocations). Deliberately did not touch hook-cold-start-bench.test.mts (its node/bun RUNTIME comparison toggle is intentional) or four out-of-scope files that share the same stale process.execPath+strip-types pattern (enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts) since they were not named in this round's scope.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/tests/artifact-stub-and-update.test.mts
  - crew/tests/build-bundle-cli.test.mts
  - crew/tests/cli-smoke.test.mts
  - crew/tests/cost-hygiene-hook.test.mts
  - crew/tests/crew-write-review-result.test.mts
  - crew/tests/dispatch-size-gate.test.mts
  - crew/tests/gepa-corpus-optimize.test.mts
  - crew/tests/gepa-corpus-sync.test.mts
  - crew/tests/hook-feature-gating.test.mts
  - crew/tests/preflight-shell.test.mts
  - crew/tests/regression.test.mts
  - crew/tests/subagent-return.test.mts
  - crew/tests/telemetry-cli.test.mts
  - crew/tests/tier-in-run-brief.test.mts
  - crew/package.json
- Confidence: high
- Risks: 4 files outside this round's named scope (enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts) still spawn CLI children via process.execPath with a stale --experimental-strip-types flag -- same latent issue, unfixed by design (not in the 15-file scope). Root suite's pre-existing 2 fails (DEC-070/DEC-068 contract-record ENOENT in learning-cycle.test.mts and eval-generator.test.mts) are unrelated to this change and were already failing before this round.
- Suggested Next Handoff: If the team wants the remaining process.execPath+strip-types drift closed, a round 4 could sweep enum-verdicts.test.mts, validate-all.test.mts, prune-artifacts.test.mts, validate-slices.test.mts the same way (drop the flag, keep process.execPath).

