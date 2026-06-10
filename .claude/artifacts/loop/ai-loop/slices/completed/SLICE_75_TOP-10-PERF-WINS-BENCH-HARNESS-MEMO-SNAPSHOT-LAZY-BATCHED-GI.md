---
id: SLICE-75
status: completed
feature: FEAT-071
phase: 3
priority: P2
target_release: v0.26.0
requires_validation: true
created: 2026-06-07
updated: 2026-06-07
tags: [test, refactor, infra]
needs_contract: false
needs_ux: false
completed_at: 2026-06-07
github_issue: 151
github_url: "https://github.com/sergeymilashico/loop/issues/151"
---
# SLICE-75: Phase C — bench harness + perf wins 1-5

Implements FEAT-071 C1+C2. See [feature file](../../../backlog/in-progress/FEAT-071.md) for product context.

## Objective

Land a `node:test`-compatible bench harness that records baseline timings and gates on 10% regression,
then ship perf wins 1-5: memoize frontmatter parse, single backlog snapshot, lazy subcommand load,
batched git reads, parallel fs walk. Target: ≥20% wall-clock cut on `/loop:brief` (median of 10 runs).

## In scope

- `src/tests/perf/bench.mts` → `tests/perf/bench.mjs`: bench harness with warm-up + p50 timing
- `src/tests/perf/bench-runner.mts` → `tests/perf/bench-runner.mjs`: CLI entry point (`npm run bench`)
- `.claude/artifacts/loop/perf/baseline.json`: recorded baseline before any win is applied
- `package.json` `bench` script: `node tests/perf/bench-runner.mjs`
- Win 1: memoize frontmatter parse — cache `(path, mtime)` key, invalidate per snapshot boundary
- Win 2: single backlog snapshot per invocation — `brief.mts` reads backlog dir once, passes array
- Win 3: lazy subcommand load — defer `import()` of subcommand modules until branch taken
- Win 4: batched git reads — replace sequential `git log` calls with one multi-arg invocation
- Win 5: parallel fs walk — `Promise.all` on independent dir reads in `auto-walker.mts`
- Unit tests for memo cache invalidation correctness (key collision + stale-read guard)

## Out of scope

- Wins 6-10 (regex hoist, decisions/grade memo, structuredClone, Map, telemetry batch) — SLICE-76
- `noUncheckedIndexedAccess` (FEAT-074) — separate feature
- CI integration of bench (bench NOT in `npm test` — too slow; gated by `npm run bench` only)
- Absolute latency SLA enforcement — gate is % regression vs recorded baseline, not absolute ms

## Acceptance criteria

- [ ] AC-1: `npm test` — 907+ pass, 0 fail (current baseline 907 pass, 1 skip)
- [ ] AC-2: `npm run lint` — 0 warnings, 0 errors
- [ ] AC-3: `npm run typecheck` — exits 0
- [ ] AC-4: `npm run bench` exits 0 — bench-runner runs 10 warm-up + 10 measured iterations of `/loop:brief --repo PWD`, reports p50 ms, compares to baseline.json, fails if p50 > baseline * 1.10 (10% regression gate)
- [ ] AC-5: `baseline.json` present at `.claude/artifacts/loop/perf/baseline.json` with keys `brief_p50_ms` and `triage_p50_ms` recorded BEFORE any win lands
- [ ] AC-6: Memo unit test — given same `(path, mtime)` key, second call hits cache (no fs read); given changed mtime, cache misses and re-reads
- [ ] AC-7: Memo invalidation test — after snapshot boundary advance (simulated by bumping a monotonic counter), cache is cleared and next read is cold
- [ ] AC-8: Validator measures p50 before and after wins 1-5; confirms brief p50 drops ≥ 10% vs pre-win baseline (≥20% target is aspirational; 10% is the hard gate)
- [ ] AC-9: No other command regresses > 10% (triage p50 vs baseline within 1.10x)

## Done When

- all acceptance criteria PASS with evidence per `01-loop-control/EVIDENCE_RULES.md`
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run bench` all pass
- feature FEAT-071 kept open (`--keep-feature-open`) — C3 wins 6-10 ship in SLICE-76
- Crew `final-synthesis` artifact written

## Implementation notes

Bench harness design (no external deps):

```typescript
// bench.mts — warm-up N runs, measure M runs, return p50
export async function benchCommand(
  label: string,
  cmd: string,
  args: string[],
  { warmup = 5, runs = 10 } = {}
): Promise<{ label: string; p50_ms: number; samples: number[] }> { ... }
```

Use `performance.now()` around `spawnSync(cmd, args, { shell: false })`.
Sort samples, take median. Write to stdout as JSON.

Memo cache design:
```typescript
// frontmatter-cache.mts
const cache = new Map<string, { mtime: number; data: Record<string, unknown> }>();
export function readFrontmatterCached(path: string, mtime: number) { ... }
export function clearFrontmatterCache() { /* call at snapshot boundary */ }
```

Wins 2-5 are mechanical refactors with no new interfaces — edit in place.

## Reviewer ladder

- Reviewer A: memo invalidation correctness (unit tests must exercise key collision AND mtime-change paths)
- Reviewer B: bench-runner exits with non-zero on regression (gate must be enforced, not advisory)
