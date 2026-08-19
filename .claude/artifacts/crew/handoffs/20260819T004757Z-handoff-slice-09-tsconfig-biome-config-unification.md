# Task Handoff: SLICE-09: tsconfig + biome config unification

- Created: 2026-08-19T00:47:57.615Z
- From: fullstack-dev
- To: lead
- Objective: Unified crew/ and root configs without pre-empting P3 flattening. 1) Biome nested-root conflict fixed: crew/biome.json now declares root:false (Biome 2.5 monorepo convention, no extends since crew rule sets genuinely diverge from root); bunx biome check . from repo root now runs clean of config errors (pre-existing lint/format findings remain, 88 errors/70 warnings/253 infos, acceptable per gate). 2) crew/tsconfig.json types array corrected from stale bun-types to bun, matching the @types/bun devDependency crew actually installs (bun-types was only resolving via a transitive dependency of @types/bun, a fragile coincidence); widened include to skills/**/*.mts to close a coverage gap for 3 orphaned .mts files, verified zero new errors via a throwaway probe tsconfig before committing the change. cd crew && bunx tsc --noEmit is 0. 3) Dropped the inert --experimental-strip-types flag from 4 test files that spawn via process.execPath (Bun itself under bun test, so the Node-only flag was a no-op): enum-verdicts.test.mts, validate-all.test.mts, validate-slices.test.mts, prune-artifacts.test.mts (3 call sites). hook-cold-start-bench.test.mts left untouched -- it correctly branches on RUNTIME===node before adding the flag. 4) package.json coherence: removed crew/package.json test:node escape hatch (DEC-007 bun-only, git history preserves it); swapped evals:view from node -e to bun -e for run-under-bun coherence (this script has a pre-existing unrelated regex-escaping bug that already fails identically under node before my change -- left unfixed, out of scope as a source-logic defect, not a config/flag issue); added root test:all running bun run test then bun run test:crew, and added --parallel to test:crew so both suites run in parallel mode as the gate expects.
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - crew/biome.json
  - crew/tsconfig.json
  - crew/package.json
  - crew/tests/enum-verdicts.test.mts
  - crew/tests/validate-all.test.mts
  - crew/tests/validate-slices.test.mts
  - crew/tests/prune-artifacts.test.mts
  - package.json
- Confidence: high
- Risks: evals:view (crew/package.json) has a pre-existing regex-escaping bug unrelated to this slice -- fails identically under node and bun, not fixed here since it is source-logic not config. test:all is defined as a strict && chain (bun run test && bun run test:crew) so it will not reach the crew suite while the 2 known-pre-existing root failures (DEC-070/DEC-068 contract-record ENOENT in learning-cycle.test.mts and eval-generator.test.mts) remain red -- both suites were verified green independently in this session (root 3310 pass/2 known-fail, crew 1971/0) but test:all itself has not been observed to complete end-to-end without those 2 pre-existing failures resolved first.
- Suggested Next Handoff: P3 flattening will eventually dissolve the crew/ prefix and these two config files should merge into one at that point -- this slice deliberately kept them separate and coherent rather than merging early. Consider whether the root:false crew/biome.json should later gain extends://" once P3 lands and rule sets are reconciled.

