# Handoff — FEAT-188 memory-transport unification: built, reviewed, landed

- **Date:** 2026-07-07
- **From:** fable (this session; supersedes `20260707-handoff-s1b-contract-transport-decision.md` — that decision was resolved and shipped)
- **Objective (completed):** unify astramem consumer transports across runner-plugin
  and dev-team into one shared package, land S1b (#357), extract the shared seam
  to plugins-common, adopt in both repos.

## What shipped (chronological)

| # | Change | Where | State |
|---|---|---|---|
| 1 | `./selector` export (resolveProvider importable as library) | astramem-plugin PR #30 | **MERGED**, main CI green |
| 2 | `@astragenie/astramem-client` 0.1.0 — new shared package | plugins-common PR #8 | **MERGED** |
| 3 | npm publish via tag `astramem-client-v0.1.0` | plugins-common Release workflow | **PUBLISHED** to registry.npmjs.org (after provenance fix — see gotchas) |
| 4 | S1b capture transport (in-process MemoryProvider, CLI spawn → fallback) + all review fixes | runner-plugin PR #361 | **MERGED** as `f2803af9`; **closes #357**; main CI green |
| 5 | runner adoption: memory-transport → thin adapter (−115 LOC) over the npm package | runner-plugin PR #362 | **MERGED** |
| 6 | dev-team adoption: astramem-provider drops hand-rolled local/saas probe (−287/+85) | dev-team PR #177 | **MERGED** as `bb1ad5ef` (after package-lock sync for the npm-ci gate) |

## The shared package (single source of truth now)

`plugins-common/packages/astramem-client` → npm `@astragenie/astramem-client@0.1.0`.

- Resolution chain: injected seam → dep-mode `@astragenie/astramem-plugin/selector` →
  dep-mode `providers/local`+`saas` health probe → runtime plugin-root discovery
  (`CLAUDE_PLUGIN_ROOT_MEMORY` env / `astramem` CLI PATH location).
- `rememberSilent`/`recallSilent`: never throw, single wallclock cap envelope
  covering resolution + call (`{capMs}` override for callers with their own deadline).
- Ships compiled `dist/` (gepa-core 0.7.0 precedent — raw `.ts` exports cause
  consumer TS5097 + cold-parse hangs, runner-plugin#360).
- Seams env-guarded (`NODE_ENV=test`/`BUN_TEST`/`VITEST`).
- Release: tag `astramem-client-v<semver>` on plugins-common main → npm auto-publish.

## Review trail

`.claude/artifacts/crew/reviews/20260707-s1b-transport-review.md` — initial
**FAIL** (2 HIGH), all findings fixed, reviewer independently re-verified from
disk → **PASS-with-followups**. Fixes shipped inside PR #361:

1. shared wallclock budget threaded into `sendViaProvider(payload, capMs)` (HIGH — was a delivery-rate regression)
2. `resolveCli()` pre-gates dropped at all 5 `emit()` call sites (provider path was dead code there)
3. env-guarded test seams
4. runtime-discovery test coverage (fake plugin-root fixture)
5. HIGH #1 (abandoned capped calls + plugin's un-unref'd 5s timers hold one-shot
   processes up to ~5s when backend slow-not-absent) — NOT consumer-fixable;
   **upstream astramem-plugin#29** (AbortSignal support or unref'd timers).

## Evidence

- runner-plugin full suite: 2302 pass / 0 fail (with fixes); memory suites 48/0
- dev-team full suite: 1709 pass / 0 fail (file-dep validation run); 21/0 on npm dep
- astramem-plugin: 828 pass; plugins-common package: 15/0 + tsc/lint/format
- dev-team FEAT-188 claims independently validated (S3a contract zero drift vs
  code; #172 decision confirmed) — researcher report in session, all 6 claims CONFIRMED

## Gotchas hit (avoid re-learning)

- **npm provenance E422**: publish fails if package.json lacks `repository.url`
  matching the GitHub repo. Fix: gepa-core-style `repository` block; delete + re-push tag.
- **@astragenie scope routing**: user-global `~/.npmrc` maps the scope to GitHub
  Packages; both bun and npm follow it. Fix: project `.npmrc` with
  `@astragenie:registry=https://registry.npmjs.org/` (dev-team had it; added to
  runner-plugin in #362).
- **Bun Windows local deps**: `file:` → EPERM, `link:` → FileNotFound. Validation
  workaround: `mklink /J` junction with ABSOLUTE target (relative resolves vs CWD).
- **dev-team CI uses `npm ci`**: package.json dep changes need `npm install
  --package-lock-only` too, not just bun.lock.

## Open items (next session picks up here)

1. ~~dev-team#177~~ — MERGED `bb1ad5ef`. Chain complete.
2. **S3b (runner-plugin#358)** — UNBLOCKED + fully cleared: adopt dev-team's frozen
   `docs/contracts/recall-injection-v1.md` helper, retire `runRecallHook` @
   `start-slice.mts:450`, golden byte-identical-when-off test. `recallSilent` in
   astramem-client is the natural transport for it.
3. **astramem-plugin#29** — upstream timer/AbortSignal fix; when it ships, the
   KNOWN LIMIT note on `sendViaProvider` can be revisited.
4. **RemoteHandle.name fidelity** (dev-team follow-up) — shared resolver doesn't
   report which backend won (local/saas); display-only today; candidate
   astramem-client 0.2 feature.
5. **Cleanup**: worktrees `plugins-common-worktrees/astramem-client`,
   `runner-plugin-worktrees/astramem-client-adoption`,
   `dev-team-worktrees/astramem-client-adoption` (all merged/landing — prune);
   husk dir `C:\work\mega\plugins-common-feat191` (node_modules only, no .git — delete);
   runner-plugin main working tree still sits on merged branch `feat/s1b-memory-transport`
   (checkout blocked: `main` held by `runner-plugin-p1` worktree).
6. **Loop hygiene**: #357/#358 are GitHub-issue-tracked (FEAT-188 backlog lives in
   dev-team), so no runner backlog move needed; dev-team's FEAT-188 rolls to done
   only after S3b.

## Suggested next handoff

S3b build (runner session): consume `recallSilent` / replicate the frozen v1 block
format, retire the duplicate `runRecallHook`, golden dispatch-trace test.
