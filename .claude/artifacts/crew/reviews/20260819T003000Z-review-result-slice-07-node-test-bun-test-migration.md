---
slice: SLICE-07
feature: FEAT-002
title: node:test to bun:test migration (crew/tests, 3 rounds)
decision: PASS
reviewed_at: 2026-08-19T00:30:00Z
reviewer: independent-review-agent
---

# Review result — SLICE-07 node:test → bun:test migration

## Decision: PASS

## Scope reviewed

3-round migration of `crew/tests` (219 files) from `node:test` to `bun:test`,
plus two production fixes and a 14-file node→bun spawn flip, all uncommitted
at review time. Base commit for diffing: `ac0b3b6f` (SLICE-06 close).

## Findings

1. **Migration completeness — PASS.** `grep -rl 'from "node:test"' crew/tests
   --include="*.mts"` returns 0 matches. No file imports both `bun:test` and
   `node:test`. 219 total `.mts` test files under `crew/tests`.

2. **Semantic preservation — PASS.** Sampled 10 files across gepa/,
   telemetry, cli-*, and hook-adjacent categories
   (`gepa-corpus-optimize`, `gepa-provenance-validate`,
   `telemetry-otel-bridge`, `telemetry-scrub`, `telemetry-span-schema`,
   `cli-smoke`, `cli-workflow`, `cost-hygiene-hook`, `hook-error-events`,
   `subagent-profile-hook`) — test count identical old vs new in every file.
   Extended the count check to all 150 modified test files
   (`test(`/`it(`/`test.skipIf(...)(` pattern): 0 mismatches. Two apparent
   mismatches from a naive grep pattern (`log-event-async-bench.test.mts`,
   `preflight-shell.test.mts`) were false positives — both use
   `test.skipIf(cond)(...)` in place of node's `{skip: cond}` options
   object, a faithful mapping; no test was dropped. Assertion mapping
   (`assert.equal`→`toBe`, `assert.deepEqual`→`toEqual`,
   `assert.match`→`toMatch`, `assert.ok(x, msg)`→`toBeTruthy()`,
   `assert.equal(x, y, msg)`→`expect(x, msg).toBe(y)`) is faithful —
   verified bun:test's `expect(actual, message)` second-arg form actually
   renders the custom message on failure (confirmed by direct execution, not
   assumption). No `.skip`/`.only` additions found anywhere in the diff (`git
   diff ac0b3b6f -- crew/tests | grep '^\+.*\.\(skip\|only\)('` → 0 hits).

3. **Suite reproduction — PASS.** `bun test tests/` (crew/) →
   **1971 pass / 0 fail / 117 skip**, exact match to the claimed numbers.
   Spot-ran 3 individually-converted files
   (`gepa-corpus-optimize`, `cli-workflow`, `cost-hygiene-hook`) → 28/28
   pass. Root suite (`bun test src/tests/ --parallel`) → **3310 pass / 2
   fail**, and the 2 failures are confirmed to be exactly the known
   DEC-070/DEC-068 contract-record fixture-drift fails (P4 scope), unrelated
   to this migration.

4. **Spawn flips — PASS.** 16 files match `spawn/Bun.spawn` with `"bun"`;
   one (`gepa/capture-sigkill-parity.test.mts`) was already using
   `Bun.spawn` pre-migration (zero diff, not one of the 14 flips — grep
   false-positive on my part, not a defect). Sampled 6 of the actually-diffed
   files (`cost-hygiene-hook`, `dispatch-size-gate`, `hook-feature-gating`,
   `telemetry-cli`, `validate-routing-table`, plus the no-diff control) —
   every flip is `spawn("node", ["--experimental-strip-types", X], ...)` →
   `spawn("bun", [X], ...)` with no target-script or extra-arg drift beyond
   the flag removal. `crew/package.json` scripts diff: 14 `node`/`node
   --experimental-strip-types` invocations flipped to `bun`; ran
   `bun run validate:manifests` directly — passes clean.

5. **Production fixes — PASS.**
   - `crew/scripts/test-shard.mts`: discovery filter is
     `entry.name.endsWith(".test.mts")` (was `.test.ts` pre-migration,
     silently sharding zero files against the renamed corpus). Ran
     `bun scripts/test-shard.mts --index {0,1,2} --total 3` directly (task
     prompt's `--shard 1/3` flag doesn't exist on this script — actual flags
     are `--index`/`--total`) → 70+70+69 = 209 files, full corpus correctly
     partitioned, no silent-zero. `tests/test-shard.test.mts` self-test:
     8/8 pass.
   - `crew/skills/workflow/test-quality/scripts/analyze.mts`:
     `TEST_FILE_RE` changed from `/\.(test|spec|fixture)\.[jt]sx?$.../ ` to
     `/\.(test|spec|fixture)\.m?[jt]sx?$.../`. Verified directly in a Node
     REPL: matches `foo.test.mts`/`foo.spec.mts`/`foo.fixture.mts` (new),
     still matches all prior `.ts`/`.js`/`.tsx` cases (no regression),
     correctly rejects bare `foo.mts` (no test/spec/fixture infix).

6. **Hygiene — PASS.** No `_convert*.py` or stray helper files anywhere
   under `crew/` (`find` empty). `git stash list` empty. `refs/salvage/post-243`
   points to `afca773c` (2026-07-28), untouched, read-only respected.
   `hook-cold-start-bench.test.mts`'s node/bun toggle is intentional
   (`HOOK_BENCH_RUNTIME` env var, defaults to `bun`) — not a missed
   conversion.

## Known/accepted items (verified, not defects)

- Root suite's 2 DEC-file fails (DEC-070/DEC-068 contract-record drift) —
  P4 scope, confirmed unrelated to this migration.
- 4 files keep `process.execPath` + a now-inert
  `--experimental-strip-types` flag under bun (`enum-verdicts.test.mts`,
  `prune-artifacts.test.mts`, `validate-all.test.mts`,
  `validate-slices.test.mts`) — count matches the reported 4 exactly. Suite
  is green regardless; flagged as a SLICE-09 cleanup item, not a SLICE-07
  blocker.
- `hook-cold-start-bench.test.mts`'s node/bun toggle — intentional,
  confirmed via `HOOK_BENCH_RUNTIME` env var default.

## Mechanical fixes applied during review

None required — no missed conversions found.

## Confidence

High. Verification was round-trip (executed suites and scripts directly,
diffed against the pre-migration base commit, cross-checked claimed file
counts against `git diff --stat`) rather than re-reading the workflow's own
summaries.
