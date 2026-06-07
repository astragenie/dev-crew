# Code-Quality Pivot — Design

**Spec id**: SPEC-004 (proposed)
**Status**: design / awaiting decomposition
**Authored**: 2026-06-07
**Standards refs**:
  - `C:\work\mega\standards\docs\typescript\coding-conventions.md`
  - `C:\work\mega\standards\docs\patterns\design-patterns.md`

---

## Problem

The `loop` plugin has accumulated ~90 source modules across rapid feature
pivots. Several modules are deprecated by decision (DEC-011 removes
the marker-queue dispatch path), one-shot migrations remain in the
build tree, and the tsconfig is materially looser than the team
TypeScript standards:

| Standards flag | Current | Standard |
|---|---|---|
| `noImplicitAny` | `false` | `true` |
| `useUnknownInCatchVariables` | `false` | `true` |
| `noUnusedLocals` | absent | `true` |
| `noUnusedParameters` | absent | `true` |
| `noImplicitOverride` | absent | `true` |
| `noFallthroughCasesInSwitch` | absent | `true` |
| `exactOptionalPropertyTypes` | absent | `true` |
| `noUncheckedIndexedAccess` | absent | `true` |

Quantified gaps:

- 255 `: any` occurrences across 71 files
- 33 `as any` across 8 files
- 23 `catch (e)` blocks with implicit `any`
- 5 deprecated/one-shot modules with 3 paired test files

No perf baseline exists. Hot CLI commands (`/loop:brief`, `/loop:triage`,
`/loop:auto`) re-walk the backlog tree multiple times per invocation and
re-parse the same frontmatter blocks.

## Goals

1. Reduce maintenance surface by deleting confirmed-dead modules + tests.
2. Align `tsconfig.json` with `standards/docs/typescript` (excluding
   React-specific rules — this is a Node CLI plugin).
3. Apply Result<T, E>, branded IDs, and discriminated unions per
   patterns guidance where it removes a real failure mode.
4. Measurable ≥20% wall-clock cut on the top 3 hot CLI commands
   without behavior regression elsewhere.

## Non-goals

- React conventions, accessibility, CSS rules — not applicable.
- Re-architecting the slice ceremony / crew dispatch contract.
- Renaming public CLI surface (`/loop:*`).
- Splitting modules below the 400-line repo limit unless naturally
  required by a refactor in scope.

## Approach

Single SPEC decomposed into three phase-FEATs (A → B → C), shipped as
~14 small slices total. Every slice keeps `npm test` + `npm run typecheck`
+ `npm run lint` green. Diff cap per slice ~500 LoC; B5 may split to
B5a/B5b if it exceeds 800.

Phases are sequenced (A → B → C). Within B, slices are graduated — one
tsconfig flag per slice, fix errors inline. Within C, the perf harness
ships first as a gate.

### Phase A — Dead-code sweep (FEAT, ~3 slices)

**Slice A1** — Delete confirmed-dead modules + tests:

- `src/scripts/lib/marker-drain.mts` + `src/tests/marker-drain.test.mts`
- Marker-write path inside `src/scripts/lib/auto-dispatch.mts`
  (retain `dispatchAgent` + audit-log appender; remove `writeMarker`,
  the pending-dispatch dir scaffold, and any marker-queue consumers).
  Reference: DEC-011 supersedes DEC-004.
- `src/scripts/lib/adhoc-migrator.mts` + `src/tests/adhoc-migrator.test.mts`
- `src/scripts/lib/legacy-migrator.mts` + `src/tests/legacy-migrator.test.mts`
  — gated step: first remove the caller in
  `src/scripts/lib/loop-installer.mts`; verify behavior unchanged for
  fresh-install path.
- `src/scripts/codemod-add-any.mts`
- `src/scripts/migrate-product-backlog.mts`
- Drop `.claude/artifacts/loop/pending-dispatch/` from any scaffold
  writer (runtime files left as-is; only source-tree references removed).

**Slice A2** — Sweep unreferenced exports using `tsc --noUnusedLocals`
+ `ts-prune` as a discovery tool. Drop one batch per concern (parsers,
walker helpers, slice-linker). Each batch ≤300 LoC diff.

**Slice A3** — Audit ambient `.d.mts` shims under
`src/scripts/lib/github-sync/`. Drop any whose runtime module was
deleted upstream. Confirm remaining shims still match the runtime
exports.

Acceptance: green CI, net LoC -1500 or better, no `/loop:*` command
behavior change.

### Phase B — Tsconfig tighten + standards alignment (FEAT, ~8 slices)

Each slice flips one flag (or one cluster), fixes the resulting
errors inline, stays green.

**B1** — `noImplicitAny: true` and `useUnknownInCatchVariables: true`.
Replace 255 `: any` and 33 `as any` sites. Narrow 23 `catch (e)` blocks
via `instanceof Error` or Zod-validated boundaries. Split into B1a
(`src/scripts/lib/*`) and B1b (`src/scripts/lib/slice-linker/*` plus
entry points) if the diff exceeds 800 LoC.

**B2** — `noUnusedLocals: true`, `noUnusedParameters: true`. Drop
unused. Convert intentionally-unused parameters to `_` prefix
(standard TS convention).

**B3** — `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`.
Cheap. Add `override` where missing; explicit `break` where
fall-through wasn't intended.

**B4** — `exactOptionalPropertyTypes: true`. Audit every `?: T` field
that is actually used as `T | undefined`; explicitly widen or change
construction site. Estimated ~20 sites.

**B5** — `noUncheckedIndexedAccess: true`. Largest impact: every
`arr[i]` becomes `T | undefined`. Narrow at every hot loop. Estimated
~50 fixes. Split into B5a (`lib/*`) + B5b (`slice-linker/*`,
`scripts/*`) if diff exceeds 800 LoC.

**B6** — Result<T, E> rollout for domain parsers and gates:

- Add `src/scripts/lib/result.mts` per the standards canonical
  implementation (`Result<T, E>`, `ok`, `err`, `map`, `flatMap`).
- Convert `backlog-parser.mts`, `frontmatter.mts`, `spec-parser.mts`,
  `grade-parser.mts` to return `Result<Parsed, ParseError>` instead of
  throwing on shape failure.
- Convert `validation-gate.mts`, `phase-gate.mts`, `walker-gates.mts`
  to return `Result<GateOutcome, GateError>`.
- Keep fs / git / network failures throwing (they are infrastructure
  boundaries and are caught at the CLI entry point).

**B7** — Branded IDs for `FeatId`, `SliceId`, `SpecId`, `DecisionId`,
`GradeId`. Each constructor validates the canonical format
(`/^FEAT-\d{3}$/`, etc.). Replace ~80 raw-string call sites. Surfaces
ID-mixing bugs at compile time.

**B8** — Discriminated unions for state. Replace boolean-flag shapes
in `stop-conditions.mts`, `walker-gates.mts`, and `halt-badges.mts`
with tagged unions; compiler enforces exhaustive handling at every
switch.

Acceptance per slice: green CI. Whole-phase acceptance: `tsconfig.json`
matches the relevant subset of `standards/docs/typescript`. Skipped
intentionally:

- React-specific rules (no React in this repo).
- `skipLibCheck: false` — kept `true` pragmatically; `@types/node` and
  `typescript-eslint` produce library-edge noise that would block CI
  for no value.
- Barrel-file ban — `src/scripts/lib/task-store/index.mts` is a
  legitimate sub-namespace entry, not a re-export aggregator.

### Phase C — Top-10 perf wins (FEAT, ~3 slices)

**C1 — Perf harness** (gate for the rest):

- New `src/tests/perf/bench.mts` running `node:test` bench blocks
  against the top 5 hot commands: `/loop:brief`, `/loop:triage`,
  `/loop:auto`, `/loop:slice-start`, `/loop:slice-complete`.
- Records baseline JSON to `.claude/artifacts/loop/perf/baseline.json`.
- CI gate: no command regresses more than 10% versus baseline.

**C2 — Wins 1–5**:

1. **Memoize frontmatter parse** — `frontmatter.mts` keyed by
   `(path, mtime)`. Brief + triage re-read the same files 5–10×
   per command.
2. **Single backlog scan, shared snapshot** — `brief.mts`,
   `auto-walker.mts`, `pattern-alerts.mts`, and `backlog-triage.mts`
   each walk `backlog/{pending,triaged,in-progress,done}`
   independently. Replace with a `loadBacklogSnapshot()` helper
   returning a frozen struct; reuse within a single command invocation.
3. **Lazy subcommand load** — `loop.mts` eagerly imports every
   sub-module. Switch to dynamic `await import()` per CLI branch.
   Estimated ~150 ms cold-start cut.
4. **Batch git reads** — replace N `execSync('git ...')` with single
   `git for-each-ref` / `git log --batch-check` invocations in
   `cost-regression.mts`, `auto-merge.mts`, `effective-cwd.mts`.
5. **Parallel fs walk** — `readdirSync` + serial parse →
   `fs.promises.readdir` + `Promise.all(parseFrontmatter)` in
   backlog / grade / decision parsers.

**C3 — Wins 6–10**:

6. **Hoist regex compilation** — survey `new RegExp` and inline
   `/.../` candidates inside hot loops (`backlog-parser`,
   `frontmatter`, `halt-badges`). Promote to module-scope `const`.
7. **Cache decisions store + grade scan** — `decisions-store.mts`
   and `grade-parser.mts` re-read full dirs per query. Add a
   per-process memo, invalidated by mtime check.
8. **Drop `JSON.parse(JSON.stringify(x))` deep clones** — replace
   with `structuredClone` (Node 17+) or shallow spread where mutation
   is not needed.
9. **Pre-built `Map` lookups** — replace `array.find(x => x.id === id)`
   inside O(N²) loops with a `Map` index. Likely candidates:
   `slice-linker/*`, `linkage.mts`.
10. **Telemetry batch flush** — `telemetry.mts` uses synchronous
    `appendFileSync` per event. Buffer in-process; flush on `process.exit`
    via an `'exit'` listener.

Acceptance: ≥20% wall-clock cut on `/loop:brief`, `/loop:triage`, and
`/loop:auto` measured by C1 harness; no other command regresses >5%.

## Sequencing

A complete → B start → C start. Once A is done, B and C slices may
interleave provided they touch disjoint files.

Total: ~14 slices. Each ≤500 LoC diff. Each green at CI.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| B5 (`noUncheckedIndexedAccess`) touches every loop body — diff blows past 800 LoC | Pre-split B5a/B5b along directory boundary; ship B5a first |
| Dead-code deletion breaks a hidden caller | A1 verifies via `npm test`; A1 step ordering requires loop-installer caller removal before legacy-migrator delete |
| Result<T, E> retrofit ripples through call sites | B6 scopes to parsers + gates only; entry points retain throw + catch at boundary, so callers in `loop.mts` and friends unchanged |
| Perf harness flakiness on CI | Use median of N runs; assert against rolling baseline, not absolute |
| Memoization introduces stale reads across long-running auto-mode | Key by `(path, mtime)`; invalidate on snapshot boundary |

## Out of scope

- Lint rule additions beyond what new tsconfig flags require.
- ADR per phase — single SPEC + per-slice grades cover decision capture.
- Bundling, esbuild adoption, ship-as-single-file. Repo remains
  `.mjs`-emitted from `.mts`.
- React, browser, accessibility — no surface here.

## Acceptance summary

- A: ≥1500 LoC net reduction; CI green; no `/loop:*` behavior change.
- B: tsconfig flags match the relevant subset of the standards doc;
  CI green per slice; no Result<T, E> leak past the parser/gate seam.
- C: perf harness in place; ≥20% wall-clock cut on the top 3 commands;
  no command regresses >5%.

## Open questions

None at design time. Each phase produces its own slice-plan artifacts
during decomposition.
