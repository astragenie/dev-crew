# Task Handoff: SLICE-75: bench harness + perf wins 1-5

- Created: 2026-06-07T13:21:44.564Z
- From: builder
- To: lead
- Objective: Bench harness with 10% regression gate implemented; frontmatter cache (win 1), parallel backlog readdir (wins 2+5), and note that wins 3/4 were already done or not applicable.
- Allowed Scope:
  - C1: bench harness (bench.mts
  - bench-runner.mts
  - npm run bench script); C2 wins 1-5: frontmatter-cache.mts with unit tests
  - backlog-parser parallel readdir
  - lazy load already present in loop.mts
  - batched git N/A (no sequential git calls exist in TypeScript sources)
- Forbidden Scope: -
- Deliverable: src/tests/perf/bench.mts + bench-runner.mts built; src/scripts/lib/frontmatter-cache.mts; src/tests/frontmatter-cache.test.mts (5 tests); backlog-parser.mts parallelized; baseline.json recorded; package.json bench script added
- Changed Files:
  - src/tests/perf/bench.mts
  - src/tests/perf/bench-runner.mts
  - src/scripts/lib/frontmatter-cache.mts
  - src/tests/frontmatter-cache.test.mts
  - src/scripts/lib/backlog-parser.mts
  - package.json
  - .claude/artifacts/loop/perf/baseline.json
- Confidence: high
- Risks: Win 3 (lazy load) was already implemented in loop.mts via dynamic import() in COMMANDS registry — no change needed. Win 4 (batched git) skipped: no sequential spawnSync/git log calls exist in any .mts source file. Bench timing will vary slightly between runs; baseline gate is 10% which provides comfortable buffer.
- Suggested Next Handoff: crew:reviewer — review frontmatter-cache correctness (key collision + stale-read guard) and bench-runner regression gate enforcement

## Self-Verify Gates

| Gate | Command | Result | Notes |
|------|---------|--------|-------|
| typecheck | `npm run typecheck` | PASS (exit 0) | Both tsconfig.json + tsconfig.test.json clean |
| lint | `npm run lint` | PASS (exit 0) | Zero warnings, zero errors |
| format:check | `npm run format:check` | PASS (exit 0) | All .mts files match Prettier style |
| tests | `node --test tests/*.test.mjs` | PASS — 912 pass, 0 fail, 1 skip | 5 new frontmatter-cache tests; up from 907 baseline |
| bench (baseline) | `npm run bench` (no baseline.json) | PASS (exit 0) | Recorded brief p50=77.2ms, triage p50=39.4ms |
| bench (gate) | `npm run bench` (baseline present) | PASS (exit 0) | brief 76.2ms ≤ 84.9ms threshold; triage 39.2ms ≤ 43.3ms threshold |
| validate-manifests | `node ./scripts/validate-manifests.mjs` | PASS (exit 0) | loop@0.25.1 OK |
| validate-content-length | `node ./scripts/validate-content-length.mjs` | PASS (exit 0) | 4 agents enforced, 18 skills all within cap |

## Win Coverage Summary

| Win | Description | Status | Notes |
|-----|-------------|--------|-------|
| Win 1 | Memoize frontmatter parse | DONE | `frontmatter-cache.mts` — cache by (path, mtime), 5 unit tests |
| Win 2 | Single backlog snapshot per invocation | ALREADY DONE | `backlog-parser.mts` had `cached()` wrapper; refactored to also parallelize |
| Win 3 | Lazy subcommand load | ALREADY DONE | `loop.mts` COMMANDS registry uses dynamic `await import()` for every handler |
| Win 4 | Batched git reads | SKIPPED (escape hatch) | No sequential `spawnSync`/`execSync`/git calls exist in any `.mts` source file — nothing to batch |
| Win 5 | Parallel fs walk | DONE | `backlog-parser.mts` `listBacklog` now `Promise.all` across all 4 state dirs |

## Bench Results

- Before (baseline, recorded with wins applied — win 3 was pre-existing, win 2 pre-existing):
  - brief p50: 77.2ms
  - triage p50: 39.4ms
- After (second bench run, gate comparison):
  - brief p50: 76.2ms (−1.3%)
  - triage p50: 39.2ms (−0.5%)
- Gate threshold: baseline × 1.10 — PASS on both

## Memo Cache Test Summary

5 tests in `src/tests/frontmatter-cache.test.mts`:
1. same path + mtime → cache hit (readFile not called second time) — PASS
2. same path, different mtime → cache miss, readFile called again — PASS
3. clearFrontmatterCache() → next call is a cold miss — PASS
4. different paths are cached independently — PASS
5. key collision guard: path+mtime unique (different paths, same mtime don't collide) — PASS
