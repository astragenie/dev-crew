---
kind: handoff
objective: SLICE-155 (FEAT-251 Phase 2) implementation complete — ready for reviewer
owner: builder
slice: SLICE-155
feature: FEAT-251
created_at: 2026-07-10
confidence: high
next_handoff: crew:reviewer then crew:verifier if behavior changed, then /loop:slice complete --id SLICE-155
---
# Handoff — SLICE-155 builder complete

**Feature:** FEAT-251 · **Slice:** SLICE-155
**Branch:** wave2-SLICE-155
**Workspace:** C:/work/mega/runner-plugin-worktrees/tp-SLICE-155

## Objective

Route every direct `github-sync` import/call in `loop.mts` through `getProvider()`
(from `src/scripts/lib/task-store/index.mts`), so `taskStore.provider` in loop.json
becomes the single switch for all tracker mirror traffic. Behavior for
`github.enabled: true` repos must stay byte-for-byte identical to the pre-refactor
direct `importGithubSync("github-sync.mjs")` calls.

## Allowed scope (respected)

- `src/scripts/loop.mts`
- `src/scripts/lib/task-store/index.mts` (not touched directly — no new export
  was needed on `index.mts` itself)
- `src/scripts/lib/task-store/providers/github-provider.mts` (small additional
  task-store edit, permitted by the dispatch note: "getProvider needs a new
  export" — GithubProvider needed new id-based methods)
- `src/tests/task-store-provider-routing.test.mts` (new)
- Did NOT touch `backlog-writer.mts` / `backlog-store.mts` (SLICE-152's file
  boundary) or anything under `slice-linker/` or `wave/`.

## What changed

1. **loop.mts** — removed the `importGithubSync` import (`./lib/github-sync-loader.mjs`)
   and all four direct call sites:
   - `runBacklogAdd` auto-publish (was line ~816) → `publishFeatureViaProvider(repoPath, result.id, config)`
   - `spec decompose` auto-publish (was line ~1339) → `publishFeatureViaProvider(repoPath, feat.id, config)` per created feature
   - `slice from-feature` auto-publish (was line ~1455) → `publishSliceViaProvider(repoPath, sl.id, featureId, opts.config ?? null)` per slice
   - `runGithubSubcommand` (was line ~1893) — rewritten and split into five small
     handlers (`runGithubSetup`, `runGithubPublish`, `runGithubFeatPublish`,
     `runGithubStatus`, `runGithubSyncOrBootstrap`) to keep cognitive complexity
     under the repo's cap of 15 (the inline version came out at 22). `setup`
     always targets a fresh `GithubProvider` directly (it bootstraps
     `github.enabled` itself and must run before any provider would resolve);
     `publish`/`feat-publish`/`status` gate on `provider instanceof GithubProvider`;
     `sync`/`bootstrap` unchanged (already routed through `getProvider()` before
     this slice).
   - Added two exported helpers, `publishFeatureViaProvider` /
     `publishSliceViaProvider`, that resolve the provider and delegate to the
     new GithubProvider methods below, no-op'ing (returning `null`) for any
     other resolved provider — mirrors the old `github.enabled: false` skip.
   - `COMMANDS.github` / `COMMANDS["task-store"]` now pass `config` through to
     `runGithubSubcommand` (previously re-resolved inside the handler).

2. **github-provider.mts** — added five GithubProvider-specific methods (not on
   the generic `TaskStoreProvider` interface — Linear has no milestone concept
   and the `github` CLI subcommand family is inherently GitHub-shaped):
   `publishFeatureById`, `publishSliceById`, `publishAll`, `syncMilestones`,
   `setup`. Each delegates to the exact same `github-sync.mjs` function the
   pre-refactor call sites used (`publishFeat`, `publishSlice`, `publishAll`,
   `syncMilestones`, `setupGithubSync`) — these functions own the idempotency
   checks, milestone upserts, and frontmatter stamping that the *interface's*
   `publishFeature`/`publishSlice` methods do not replicate, so behavior parity
   required delegating to them directly rather than reimplementing that logic
   against the plain interface methods.

   Two bugs found and fixed along the way (both real, not test artifacts):
   - **Windows path bug** in `importGithubSyncModule`: dynamic `import()` was
     given a raw backslash path instead of a `file://` URL, so any load of the
     top-level `github-sync.mjs` (as opposed to a submodule like `gh.mjs`)
     threw `Cannot find github-sync module`. This was a pre-existing bug in the
     already-shipped `syncPull`/`bootstrap` methods too, masked because every
     existing test short-circuits before reaching that import via a throwing
     mock `ghExec`. Fixed with `pathToFileURL()`; also added the missing
     candidate path for the top-level file (it's a *sibling* of the
     `github-sync/` submodule folder, not inside it — the old candidate list
     only had subfolder-shaped paths).
   - **Double-gate bug**: `taskStore.provider: "github"` set explicitly
     (without also setting `github.enabled: true`) correctly resolved a
     `GithubProvider` via `getProvider()`, but every call then silently
     no-op'd because `github-sync.mjs`'s own functions gate on
     `config.github.enabled`. Fixed via `GithubProvider._enabledConfig()`,
     which forces `github.enabled: true` in the config handed to the
     underlying functions — once `getProvider()` has decided "use github,"
     that decision is authoritative. Caught by the AC-5 parity test.

## Test evidence

- New: `bun test src/tests/task-store-provider-routing.test.mts` — 15 pass, 0 fail
  (4 tests per AC-1/AC-2/AC-3, 2 for AC-5, 1 grep-based regression test for AC-4).
- Regression: `bun test src/tests/task-store-github-provider.test.mts
  src/tests/task-store-index.test.mts src/tests/github-sync.test.mts
  src/tests/cli-from-feature-audit.test.mts src/tests/spec-decompose-architect.test.mts`
  — 98 pass, 0 fail.
- Full suite: `bun test src/tests/ --parallel --timeout 60000` — 2599 pass, 1 skip,
  0 fail attributable to this change. One flaky test observed
  (`memory-transport.test.mts`, the documented known flake) plus one additional
  timing-sensitive flake (`start-slice-recall-v1.test.mts`) seen only under
  parallel contention on one run; both pass cleanly in isolation and neither
  file touches task-store/github-provider/loop.mts subcommand routing.
- `bunx tsc --project tsconfig.json --noEmit` and `--project tsconfig.test.json --noEmit`: clean.
- `bunx biome lint` on touched files: clean (no new warnings; the
  `runGithubSubcommand` complexity refactor specifically eliminated a
  22-vs-cap-15 warning that the initial inline version introduced).
- `bun run format` / `bunx biome format src/`: clean.
- `bun ./src/scripts/validate-imports.mts`: OK.
- `bun ./src/scripts/validate-manifests.mts`: OK.
- `bun ./src/scripts/validate-content-length.mts`: OK.

## AC checklist

All 5 ACs on FEAT-251 and SLICE-155 ticked `[x]` with evidence inline in both
files (`.claude/artifacts/loop/backlog/in-progress/FEAT-251.md`,
`.claude/artifacts/loop/ai-loop/slices/pending/SLICE_155_IMPLEMENT-FEAT-251.md`).

## Deliverable

- `src/scripts/loop.mts` (modified)
- `src/scripts/lib/task-store/providers/github-provider.mts` (modified)
- `src/tests/task-store-provider-routing.test.mts` (new)
- `.claude/artifacts/loop/backlog/in-progress/FEAT-251.md` (AC checkboxes ticked)
- `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_155_IMPLEMENT-FEAT-251.md` (AC checkboxes ticked)
- This handoff.

## Confidence

High — full behavior-parity test suite green, zero remaining direct
`importGithubSync` calls in `loop.mts` (grep-verified), two real latent bugs
found and fixed along the way rather than papered over.

## Risks or open questions

- `github setup`/`publish`/`status` subcommands now gate on `getProvider()`
  resolution rather than `config.github.enabled` alone. This is the intended
  behavior per FEAT-251 ("taskStore.provider is the single switch for ALL
  mirror traffic") but is a genuine behavior change for the corner case of
  `taskStore.provider: "noop"` + `github.enabled: true` (previously these
  subcommands would still publish; now they no-op). Flagged for reviewer
  awareness, not treated as a bug — matches the FEAT's explicit intent.
- Commit not yet made (dispatch instructions: builder implements, parent loop
  drives review/validation/close). Working tree is clean of unrelated changes;
  ready for `git add` + commit once review clears.

## Suggested next handoff

Parent loop dispatches `crew:reviewer` (fan-out per this repo's `["A"]`
ladder), then `crew:verifier` since behavior changed, then runs
`/loop:slice complete --id SLICE-155`.
