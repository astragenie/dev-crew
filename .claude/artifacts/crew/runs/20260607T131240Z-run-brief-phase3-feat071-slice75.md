---
phase: "3"
feature: FEAT-071
---
# Run Brief: PHASE3 FEAT071 SLICE75

- Created: 2026-06-07T13:12:40.417Z
- Goal: Land a `node:test`-compatible bench harness that records baseline timings and gates on 10% regression, then ship perf wins 1-5: memoize frontmatter parse, single backlog snapshot, lazy subcommand load, batched git reads, parallel fs walk. Target: ≥20% wall-clock cut on `/loop:brief` (median of 10 runs).
- Mode: autonomous
- Pace: unattended
- Owner: loop
- Status: active
- Summary: -
- Scope:
  - - `src/tests/perf/bench.mts` → `tests/perf/bench.mjs`: bench harness with warm-up + p50 timing
- `src/tests/perf/bench-runner.mts` → `tests/perf/bench-runner.mjs`: CLI entry point (`npm run bench`)
- `.claude/artifacts/loop/perf/baseline.json`: recorded baseline before any win is applied
- `package.json` `bench` script: `node tests/perf/bench-runner.mjs`
- Win 1: memoize frontmatter parse — cache `(path
  - mtime)` key
  - invalidate per snapshot boundary
- Win 2: single backlog snapshot per invocation — `brief.mts` reads backlog dir once
  - passes array
- Win 3: lazy subcommand load — defer `import()` of subcommand modules until branch taken
- Win 4: batched git reads — replace sequential `git log` calls with one multi-arg invocation
- Win 5: parallel fs walk — `Promise.all` on independent dir re
- Out Of Scope:
  - - Wins 6-10 (regex hoist
  - decisions/grade memo
  - structuredClone
  - Map
  - telemetry batch) — SLICE-76
- `noUncheckedIndexedAccess` (FEAT-074) — separate feature
- CI integration of bench (bench NOT in `npm test` — too slow; gated by `npm run bench` only)
- Absolute latency SLA enforcement — gate is % regression vs recorded baseline
  - not absolute ms
- Planned Files: -
- Next Step: Begin implementation

