# Bun Migration — loop plugin performance design

**Date:** 2026-06-10
**Status:** approved (brainstorming session)
**Goal:** cut the three latencies that hurt day-to-day — `npm test` wall time,
the tsc build chain, and per-command CLI spawn cost — by migrating the plugin
to Bun as its sole runtime, executing `.mts` sources directly.

## Baseline measurements (2026-06-10, Node v24.15.0, Windows 11)

| Surface | Cost today |
|---|---|
| `node scripts/loop.mjs status` | 259 ms (bare `node -e 0` = 153 ms) |
| CLI invocations across `commands/*.md` | 47 call sites; heaviest flows: backlog-enrich ×4, auto ×3, learn ×3 |
| `npm run build` (tsc emit) | 5.4 s |
| `npm run build:tests` | 6.1 s |
| Full test suite (1163 tests, node --test) | ~157–227 s wall, after the ~11.5 s build prefix |
| Worktree-manager test file (real git repos per test) | ~35 s of the suite |

Runtime dependency surface: **zero** — the plugin is stdlib-only Node ESM.
Compat risk therefore reduces to Bun's node-builtin coverage
(`fs/promises`, `child_process.execFile`, `readline`, `path`, `url`).

## Decisions taken (with user, 2026-06-10)

1. **Pain points in scope:** test wall time, build chain, ceremony CLI calls.
   Artifact-I/O runtime wins are NOT in scope — owned by FEAT-169
   (backlog-snapshot + parseFrontmatterCached + memoization, SDD specs written).
2. **Bun scope: full migration.** Bun becomes a hard install requirement for
   plugin users. The "works wherever Node is" contract is intentionally broken.
3. **Dist contract: run `.mts` directly.** No transpile step, no emitted
   `scripts/` tree, no src↔scripts drift gate. `tsc --noEmit` stays as the
   type gate.
4. **Test runner: compat first.** Existing `node:test` files run under Bun's
   compat layer; codemod individual files to `bun:test` only where compat
   breaks. `node:assert` stays.
5. **Sequencing: staged (approach B).** Three independently shippable slices;
   big-bang swap rejected for blast-radius reasons.

## Slice 1 — dev/CI lane (no user-facing change)

- Suite runs from sources under Bun: `bun test src/tests/` (or equivalent
  invocation against the `node:test` compat layer — exact flag set is a
  plan-phase detail). The 11.5 s build prefix disappears from the test path.
- Files where Bun's `node:test` compat breaks are codemodded to `bun:test`
  individually; `node:assert/strict` imports remain.
- `package.json`: `test` script switches to Bun; `typecheck`, `lint`,
  `format` unchanged. `build`/`build:tests` remain (still shipping `.mjs`
  until Slice 2).
- CI: add `oven-sh/setup-bun`; keep `setup-node` while emit + drift gate
  exist. Pre-push hook (`scripts/pre-push-validate.mjs`) runs under Bun.
- **Stage gate:** full suite green under Bun on **windows-latest and
  ubuntu-latest** before Slice 2 starts. If an unfixable compat blocker
  surfaces, ship Slice 1's CI wins and halt the migration (de-facto fallback
  to dev/CI-only Bun).

## Slice 2 — runtime cutover (breaking change)

- Replace every `node …/scripts/loop.mjs` reference with
  `bun …/src/scripts/loop.mts`: all `commands/*.md`, `skills/**`, hook
  configurations (`guard-feat-dispatch`, `version-check`), README examples.
  47+ mechanical call-site edits.
- Runtime-only `.mjs` modules (github-sync tree, setup-github-sync,
  setup-task-store, competitor-audit/aggregate, eslint.config, hooks) stay
  `.mjs` — Bun executes them. **Verification item V1:** their imports of
  formerly-emitted files (e.g. `../slice-title.mjs`) must resolve to `.mts`
  sources under Bun's `.mjs → .mts` specifier mapping. Fallback: rewrite
  those specifiers to `.mts`.
- Guard rails, mirroring the `MIN_CREW_VERSION` pattern in
  `scripts/lib/plugin-identity.mjs`: add `MIN_BUN_VERSION`, a doctor check,
  an install-gate refusal, and a version-check hook message so a missing or
  stale Bun fails fast with "install bun >= X", never a cryptic spawn error.
- Delete: emitted `scripts/` tree (except the hand-authored runtime-only
  exceptions listed in CLAUDE.md), `build` + `build:tests` scripts, the
  `git diff --exit-code scripts/` CI gate, `setup-node` in CI.
- Docs: README + ADOPTION.md install requirement, `docs/code-conventions.md`
  rewrite of the emit rules, CLAUDE.md repo-conventions update.
- Release: minor version bump with a loud breaking-change CHANGELOG entry.

## Slice 3 — ceremony batching

With spawn cost ~10× lower, collapse sequential multi-call command flows into
compound CLI subcommands returning one combined JSON payload:

- `backlog-enrich`: 4 calls → 1
- `auto`: 3 → 1
- `learn`: 3 → 1
- 2-call flows (`retrospective`, `slice-from-feature`, `backlog-add`) where
  the calls are strictly sequential.

Granular subcommands remain — nothing external breaks. Command `.md` files
shrink accordingly.

## Error handling

- Missing/old Bun → fail fast at every entry point with the actionable
  install message (doctor + install gate + version-check hook).
- `process.exitCode` semantics preserved under Bun (no `process.exit(N)` in
  library code — existing repo rule unchanged).
- The two hand-authored hooks get explicit smoke tests under Bun.

## Testing & evidence

- Stage gates per slice; Slice 1's cross-platform green suite is the
  migration go/no-go.
- CI matrix gains `windows-latest` — Windows `execFile` quoting is the
  likeliest compat edge and the primary user machine is Windows.
- Bench evidence via existing `tests/perf/bench-runner.mjs`: before/after for
  `status` and `brief`; suite wall time recorded in each slice grade.

## Success criteria

- Test path: `npm test` total (build + run) drops from ~170–240 s to the
  Bun suite run alone; no build prefix. Target: < 50% of baseline wall time
  (git-spawning fixture tests still dominate the floor — see out-of-scope).
- CLI: `loop status` p50 < 80 ms (from 259 ms).
- Zero emitted-file drift class of CI failures (gate deleted with the tree).
- Plugin installs and runs on a machine with Bun only (no Node present).

## Out of scope

- FEAT-169 runtime wins (snapshot caching, parseFrontmatterCached,
  memoization) — separate, already specced.
- Worktree-test fixture cost (~35 s) — file as separate FEAT; the fix is
  fixture pooling/reuse, runtime-agnostic.
- Porting runtime-only `.mjs` modules to `.mts` — follow-up chore, not a
  migration rider.

## Open verification items (plan phase)

- **V1:** Bun resolves `.mjs` specifiers to `.mts` sources (Slice 2 blocker
  if false — fallback: specifier rewrite).
- **V2:** Bun `node:test` compat coverage across the 1163-test suite
  (Slice 1 discovers; per-file codemod fallback).
- **V3:** Bun on windows-latest CI runner parity (matrix added in Slice 1).
