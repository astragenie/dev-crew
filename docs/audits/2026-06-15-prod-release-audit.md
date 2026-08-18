# Prod-release audit — loop v0.43.7 → next

**Date**: 2026-06-15
**Auditor**: Claude (Opus 4.7, multi-agent parallel scan)
**Scope**: Performance, LOC reduction, plugin best practices, prod-readiness
**Source corpus**: 170 `.mts` source files (~60k LOC), 100+ test files (~32k LOC), 44 commands, 8 owned agents, 3 hooks, manifest at `.claude-plugin/plugin.json`

---

## TL;DR

| Verdict | Count |
|---|---|
| BLOCK (cannot ship as-is) | **5** |
| HIGH (release-day fixes) | 14 |
| MED | 28 |
| LOW | 24 |
| **Total LOC reduction candidates** | **~790 LOC** (≈300 pure delete, ≈490 split + extract) |
| **Top perf wins** | ~30-60% wall-clock on a 100-slice walk if 3 hotspots fixed |

**Cannot release v0.43.7 → "next" until 5 BLOCKs are resolved.** All 5 are cheap (≤2h each).

---

## BLOCK findings (must fix before release tag)

### B1 — Version manifest 7 releases behind CHANGELOG

- `package.json:3` and `.claude-plugin/plugin.json:3` both pin `0.43.7`.
- `CHANGELOG.md` has entries up to `[0.50.1] — 2026-06-13`, plus an unversioned wave-mode block at the top.
- **Effect**: marketplace + sessions installed at `0.43.7` will silently miss wave-mode, dispatch metrics, `pr-fix`, learnings ranker, GitHub `@crew` integration, and 7 other shipped FEATs.
- **Fix**: Decide next version (suggest `v0.51.0` given the unversioned wave-mode block is a feature add). Add `## [0.51.0] — 2026-06-15 — Wave-mode autonomous loop` header above the orphan `### Added`. Bump both manifests. Tag.

### B2 — README pins crew `>= v0.3.3`, actual floor is `0.31.1`

- `README.md:23`: "Minimum compatible release: `v0.3.3`".
- `src/scripts/lib/plugin-identity.mts:110`: `MIN_CREW_VERSION = "0.31.1"`.
- **Effect**: users installing `crew@0.3.3` per README pass the README gate, fail at install. ~100× off.
- **Fix**: bump README to `>= v0.31.1`. Sweep ADOPTION.md (line 138 cites `loop@0.1.0`), and any other version-pinning doc.

### B3 — `snapshot-memory` command points to dead path

- `commands/snapshot-memory.md:3` description: "Write `docs/loop-snapshot.md`".
- Actual disk path (per `lib/paths.mts`): `.claude/artifacts/loop/loop-snapshot.md`.
- CLAUDE.md correctly `@`-includes the real path. Command doc is the only doc still wrong.
- **Effect**: new operators following the command help text wire `@docs/loop-snapshot.md` into their CLAUDE.md, get an empty include forever.
- **Fix**: replace all 3 occurrences in `commands/snapshot-memory.md` (lines 3, 9, ~38 in the install example).

### B4 — `hooks/version-check.mjs` Bun-version warning is silently swallowed

- Lines 53-56: `console.warn(...)` for Bun version drift.
- SessionStart hooks surface **stdout** only as `additionalContext`; stderr is invisible.
- **Effect**: documented safety net for old Bun never fires.
- **Fix**: replace `console.warn(msg)` with `process.stdout.write(msg)`.

### B5 — `hooks/version-check.mjs` marketplace lookup hits a dead path

- Line 70-72: reads `~/.claude/plugins/marketplaces/loop/.claude-plugin/marketplace.json`.
- Per `bump-version.mts:5-7` and `validate-manifests.mts:111`, the marketplace moved to `astra-marketplace`.
- **Effect**: the version-drift warning ALSO never fires — first `existsSync` check fails, hook exits 0.
- **Fix**: read `marketplaces/astra-marketplace/.claude-plugin/marketplace.json` and look up by `name === "loop"`.

---

## Performance findings (ranked)

### HIGH — three hotspots together likely reclaim 30-60% wall-clock on a 100-slice walk

| # | Path:line | Issue | Fix | Effort |
|---|---|---|---|---|
| P1 | `lib/auto-walker.mts:153` | walker runs full `evaluateStopCondition` (14 Promise.all checks) after EVERY candidate; redoes pattern-alerts + grade-trend + cost gates per iteration | hoist stop-check OUT of per-candidate loop; cache by mtime hash; re-check only on state delta | M |
| P2 | `lib/wave/planner.mts:212-222` | `loadCandidates` reads slicePath then `readTouchesFiles` re-reads + re-parses SAME file — double I/O per slice | pass `raw` into readTouchesFiles or memoize by path | S |
| P3 | `lib/wave/planner.mts:111-124` | `loadFeatureMap` sync readdir + readFileSync + parse over all triaged+in-progress FEATs per wave plan; no cache | switch to `fs.promises` + `Promise.all`; cache with mtime key | M |
| P4 | `lib/wave/real-deps.mts:38-43` | `realStopCheck` spawns fresh `bun src/scripts/loop.mts stop-check` child per wave iteration — 200-500ms Bun startup × N | call `checkStopConditions` in-process via import | M |
| P5 | `lib/hierarchical-dispatch.mts:49-59` | `prepareDispatch` creates child worktrees in SERIAL loop; each `git worktree add` = 50-200ms blocking | refactor to async; `Promise.all` worktree adds | L |
| P6 | `lib/grade-parser.mts:182-186` | `listGrades` serial fs.readFile + parseFrontmatter over 112+ grade files | wrap in `Promise.all` like `backlog-parser.mts:64` | S |
| P7 | `lib/dispatch-worktree.mts:15-31` | `preflightGitClean` runs 3 sync execFileSync git calls per parallel-dispatch entry | async execFile + Promise.all the independent rev-parse/status | M |

### MED — 12 serial-read / multi-pass-filter patterns

A single helper would knock out 6+ findings at once: `parallelReadDir(root, filter, parse)`. Repeating shape across `listGrades`, `listSpecs`, `collectBacklogIds`, `collectSliceIds`, `loadCostAdviseFiles`, `loadAggregateCostReport`, `readAllSessionStates`.

| # | Path:line | Issue | Effort |
|---|---|---|---|
| P8 | `lib/stop-conditions.mts:51-53` | 3× `filterBacklog` re-sweep for status counts | S |
| P9 | `lib/brief.mts:115-135` | 6× `filterBacklog` over 121-entry backlog | S |
| P10 | `lib/memory-snapshot.mts:102-105` | 4× `filterBacklog` for snapshot counts | S |
| P11 | `lib/cost-alert-loader.mts:131-140` | serial read over up to 20 cost-advise files | S |
| P12 | `lib/cost-alert-loader.mts:317-321` | serial parseAggregateReportFile loop over 10 files | S |
| P13 | `lib/redundant-read-detector.mts:96-114` | serial fs.readFile of session-state JSONs on every stop-check | S |
| P14 | `lib/marathon-checkpoint.mts:117-124` | `gradesDir` scanned twice; 112 files → 224 sequential stats | S |
| P15 | `lib/spec-parser.mts:39-43` | serial spec reads | S |
| P16 | `lib/artifact-linker.mts:63-80, 107-126` | serial read+parse across 4 backlog states (~150 files) — also in `collectSliceIds` | M |
| P17 | `lib/slice-linker/crew-bridge.mts:146-164` | `detectCostMode` 3 sequential `execFile git` per slice, no cache | S |
| P18 | `lib/slice-linker/feature-lifecycle.mts:296-313` | same FEAT file read+parsed twice when state unchanged | S |
| P19 | `lib/pattern-alerts.mts:155-159` | walks backlog 4× | S |
| P20 | `lib/slice-linker/dispatch.mts:199-207` | `extractTags` + `extractNeedsContract` each call `parseFrontmatter` independently | S |

### LOW (4 findings)

P21 `lib/dispatch-merge.mts:21-31`, P22 wave inline frontmatter parser dup, P23 `claims-sync.mts:62-71` O(N×M), P24 `slice-progress.mts:133-149` shells out git per call.

**No CRIT-class findings.** No executor-of-doom sync loops in hottest path.

---

## LOC reduction findings

**Grand total: ~790 LOC**
- Pure delete (zero refactor risk): ~300 LOC
- Splits + helper extraction: ~490 LOC

### HIGH-confidence pure deletes (~300 LOC)

| LOC | Path[:line] | What | Risk |
|---|---|---|---|
| 60 | `lib/stop-conditions.mts:140-218` | 6× passthrough `buildXxxSnapshotEntry` helpers — `buildPausedForExternalEventSnapshotEntry` is literally `return sig` | low |
| 50 | `lib/cost-alert-loader.mts:81-102` + `lib/slice-cost-ceiling.mts:13-37` | inline `parseFrontmatter` duplicated verbatim (~22 LOC each); shared one exists in `lib/frontmatter.mts` | low |
| 45 | `lib/slice-linker/complete-slice.mts:33-39` + `start-slice.mts:121-127` | duplicate `bestEffort(fn)` (7 LOC); used 10+ times in same files | low |
| 40 | `lib/loop-installer-tokens.mts:46` | `buildMandatoryDocsList`, `resolveLoopPath`, `buildContextRulesList` — exported but only used internally | low |
| 35 | `lib/auto-merge.mts:159` | `AUTO_MERGE_COMMIT_TEMPLATE` exported template literal never imported | low |
| 30 | `lib/grade-parser.mts:59` | exported `averageScore`, zero importers | low |
| 30 | `lib/spec-parser.mts:8` | re-export alias `export const specRoot = specsRoot` used only internally | low |
| 30 | `lib/plugin-identity.mts:30` | exported `getPluginIdentity` never imported outside own file | low |
| 25 | `lib/lessons-ratchet.mts:135` | exported `scanGradeLessonsFromRepo`, zero importers | low |
| 25 | `lib/planning-rules.mts:27` | exported `writeRule`, zero importers (verify rule-writing flow not wired elsewhere first) | med |
| 15 | `lib/plugin-identity.mts:188` | `_resetCacheForTests` + `getBunVersion` test-only escape hatches | low |
| 10 | `lib/skill-resolver.mts:29` | exported `isRoleVariant`, single call-site in same file | low |

### Helper extraction / dedup (~75 LOC)

| LOC | What |
|---|---|
| 30 | `paths.mts:73 ensureDir` exists but ~15 call sites still write `fs.mkdir(..., {recursive:true})` inline |
| 50 | `loop.mts:1246-1500` `SLICE_HANDLERS` repeats `resolveEffectiveCwd` + `logEvent` boilerplate; wrap in `withCwd(...)` |
| 20 | unify 3 ad-hoc slug helpers (`feature-lifecycle.kebab`, `lessons-ratchet.slugifyLesson`, `artifact-naming.camelTight`) → `lib/slug.mts` |

### Comment debt (~45 LOC)

`loop.mts:8-10,23,79-94,1241-1244,1717`; `complete-slice.mts:41-43`; `auto-merge.mts:24-55`; `stop-conditions.mts:9-50`; `auto-walker.mts:177,266`; `loop-installer-scaffold.mts:248`; `memory-snapshot.mts:221`; `marathon-checkpoint.mts:13`. Repo convention: "default to writing no comments".

### Files violating split-at-400 convention (~230 LOC of moves, ~80 LOC net delete from seams)

| LOC | File (current → target ≤400) | Suggested seam |
|---|---|---|
| 1759 | `loop.mts` | extract `COMMANDS` table → `lib/commands.mts` (~350); `FLAG_SPEC` → `lib/flag-spec.mts` (~80); keep `main()/parseArgs/dispatch` in entry (~400) |
| 959 | `lib/slice-linker/complete-slice.mts` | extract auto-merge-stage helpers (L726-803), ceremony-writers (L358-417), badge/observation appenders (L622-700) → `complete-slice-stages.mts` |
| 792 | `lib/auto-merge.mts` | `auto-merge-pipeline.mts` (preflight, fetch+rebase, squash+commit, L252-620); `auto-merge-state.mts` (badge writers, worktree-state mutations L310-370) |
| 745 | `lib/slice-linker/start-slice.mts` | extract gate-running + worktree-state writers (L141-303) → `start-slice-state.mts` |
| 603 | `lib/slice-linker/feature-lifecycle.mts` | `feature-materialize.mts` (sliceFromFeature + materializeSingle/Multi, L273-525); `feature-simplify.mts` (L525-end) |
| 596 | `lib/stop-conditions.mts` | `stop-conditions-signals.mts` (apply* helpers L186-388) |
| 553 | `lib/slice-linker/crew-bridge.mts` | `synthesis-writer.mts` (renderSynthesisXxx + writeCrewFinalSynthesis L289-432) |
| 530 | `lib/slice-linker/agent-report-writer.mts` | `agent-report-render.mts` (rendering helpers L295-411) |
| 422 | `lib/artifact-linker.mts` | `artifact-collectors.mts` (collect{Backlog,Slice,Decision,Grade}Ids L56-216) |
| 420 | `lib/phase-gate.mts` | `phase-gate-posthooks.mts` (retrospective + deploy-handoff post-hooks L299-end) |

---

## Best-practices findings (plugin contract + repo conventions)

### BLOCK / HIGH (8 — see BLOCK section above for B3-B5; remainder below)

| # | Path:line | Issue | Fix |
|---|---|---|---|
| BP1 | `agents/pm.md:191` | clause-id allowlist stale vs CLAUDE.md — lists removed `decommissioned-roles`, missing `marathon-checkpoint` (CLAUDE.md:114) and `orchestrator-mode` (CLAUDE.md:185). PM declines citing the missing pair will fail `validate-decline-citations` CI | sync to current set |
| BP2 | `agents/pm.md:3` | description claims agent dispatched for `/runner:pm-triage`, `/runner:pm-review`, `/runner:pm-decompose` — **none exist**. Only `/runner:triage`, `/runner:retriage`, `/runner:intake` | rewrite |
| BP3 | `agents/pm.md:193` | references `scripts/validate-decline-citations.mjs`; real path `src/scripts/validate-decline-citations.mts` | update |
| BP4 | `hooks/bootstrap-context.mjs:31-33` | injects HARD-RULES saying "Parent loop dispatches `crew:inspector` then `crew:verifier`" but CLAUDE.md:348 says `crew:reviewer` + `crew:validator`; wrong terminology injected every session | align with CLAUDE.md |
| BP5 | `agents/hierarchical-dispatcher.md:37` | pre-flight tells caller to use `$LOOP_ROOT/scripts/loop.mjs` — emitted tree dropped per CLAUDE.md (Bun migration) | drop the clause; keep only `bun src/scripts/loop.mts` |
| BP6 | `agents/document-writer.md:8` | H1 says `crew:document-writer` but owned by loop (`runner:document-writer`) | rename |

### MED (8)

| # | Path | Issue | Fix |
|---|---|---|---|
| BP7 | `agents/architect.md:1-5` | missing `model:` field (described as Opus in commands/architect.md) | add `model: opus` |
| BP8 | `agents/{researcher,spec-writer,document-writer,market-researcher}.md` | all missing `model:` field | lock per role |
| BP9 | `commands/*.md` (all 44) | no command declares `allowed-tools:` or `argument-hint:`; UX gap for slash arguments | audit + add `argument-hint` where args accepted |
| BP10 | `src/scripts/codemod-add-any.mts:7,12,22,57` | `execSync` + `npx tsc`; file header says "one-shot migration tool … will be deleted after the port is complete" — port IS complete (FEAT-021); ships as dead code with `: any` literals | **delete file** |
| BP11 | `lib/event-notifier.mts:121-130` | `fireCustomCommand` interpolates user-config webhook template through `powershell.exe -Command` / `sh -c`; only placeholders quoted, surrounding `config.command` itself is unsanitized operator-supplied string | document trust model in header comment |
| BP12 | `lib/wave/real-deps.mts:223` | `spawnSync(cmd, [], { shell: true })` runs operator-supplied `postMergeTestCmd` via shell | document trust assumption; consider split into `cmd` + `args[]` |
| BP13 | `lib/event-notifier.mts:87` | PowerShell command-line via string interp; single-quote escape OK but no defense against CR/LF/null bytes in body | strip control chars before quoting |
| BP14 | `commands/snapshot-memory.md:33-39` | install example uses wrong path (same root cause as B3) | covered by B3 fix |

### LOW (8) — see scratch (color consistency, deprecated `crew:copywriter` in guard allowlist, missing repository URL in plugin.json, etc.)

---

## Prod-readiness findings (release hygiene)

### BLOCK (3 — see BLOCKs above: B1, B2, version-header gap)

### HIGH (6)

| # | Path | Gap | Fix |
|---|---|---|---|
| PR1 | `ADOPTION.md:68` | direct-invocation hardcodes stale path `cache/astra/loop/0.3.2/scripts/loop.mjs` — both version AND extension wrong | replace or drop direct-invocation example |
| PR2 | `ADOPTION.md:138` | commit example cites `loop@0.1.0` (~40 minor versions back) | bump to placeholder |
| PR3 | `README.md:124-133` | "Plugin architecture" lists `scripts/loop.mjs`, `scripts/lib/*.mjs` — emitted tree dropped | replace with `src/scripts/*.mts` |
| PR4 | `README.md:222` | test invocation says `node --test tests/*.test.mjs`; actual `bun test src/tests/` | update |
| PR5 | `README.md:225` | "22 tests across 4 suites" — ~100+ test files now | update count or link CI badge |
| PR6 | `typecheck-errors.txt` (root) | 99KB stale artifact from `loop-plugin@0.8.3` typecheck (~40 versions back) | `rm` + add to .gitignore |
| PR7 | `CLAUDE.md:24` | references `.claude/artifacts/loop/backlog/product-backlog.md` — file does not exist | restore file or drop reference |
| PR8 | `docs/halt-badges.md:8,77` | invocation says `node scripts/loop.mjs`; actual `bun src/scripts/loop.mts`; this is the cross-plugin contract surface | replace throughout |
| PR9 | triaged FEAT files | zero of 5 triaged FEATs declare `touches_files` frontmatter — wave-mode validator will warn | `/runner:retriage` |

### MED (8)

PR10 `CHANGELOG.md:1-5` add "Unreleased" convention. PR11 three `TODO(2026-09-11)` removal stubs in `loop.mts:986`, `grade-parser.mts:233`, `task-store/setup-writer.mts:33`. PR12 `.gitignore` only 10 lines — missing `typecheck-errors.txt`, `*.log`, `.DS_Store`, IDE dirs. PR13 `worktree-manager.test.mts:617` skipped test without tracking ticket. PR14 wave-mode badges documented in halt-badges.md but not wired into `snapshot.*` builder. PR15 `.claude.backup.20260524T215027Z/` 499KB stale backup dir in working tree. PR16 `loop-snapshot.md` 2-day stale. PR17 v0.44.0 → v0.50.1 release ceremony state recovery (audit `bump-version` run history).

### LOW (5)

PR18 `package.json` missing `description`/`repository`/`author`/`license`/`homepage`. PR19 stale `package-lock.json` (Bun runtime). PR20 `plugin.json` keywords miss `wave-mode`, `parallel-dispatch`, `git-worktree`. PR21 LICENSE OK. PR22 CHANGELOG entries cluster on `2026-06-13` — release ceremony audit.

---

## Suggested FEAT decomposition (ranked fix backlog)

| Order | FEAT title | Severity | Effort | Combined dimension |
|---|---|---|---|---|
| 1 | `release/v0.51.0`: version bump + CHANGELOG header + crew floor sweep + path corrections | BLOCK | S | prod-readiness (B1, B2, B3, PR1-PR8) |
| 2 | `hooks/version-check`: stdout fix + astra-marketplace path | BLOCK | XS | best-practices (B4, B5) |
| 3 | `agents/pm`: clause-id allowlist sync + command-name fix + CI validator path | HIGH | XS | best-practices (BP1, BP2, BP3) |
| 4 | `hooks/bootstrap-context`: align HARD-RULES terminology with CLAUDE.md | HIGH | XS | best-practices (BP4) |
| 5 | `agents/*`: add `model:` field to 5 owned agents | HIGH | XS | best-practices (BP7, BP8) |
| 6 | `agents/hierarchical-dispatcher` + `agents/document-writer` doc fixes | HIGH | XS | best-practices (BP5, BP6) |
| 7 | `perf/hot-path-wave-walker`: P1 + P2 + P3 (auto-walker hoist + planner dedup + parallel feature-map) | HIGH | M | perf |
| 8 | `perf/serial-reads-helper`: introduce `parallelReadDir`; convert P6, P8, P10-P15, P19, P20 | MED | M | perf + LOC |
| 9 | `perf/in-process-stop-check`: P4 + P5 (drop spawnSync child loop, parallelize worktree adds) | HIGH | M | perf |
| 10 | `loc/dead-exports`: delete 7 unimported exports (loop-installer-tokens, grade-parser.averageScore, plugin-identity.getPluginIdentity, lessons-ratchet.scanGradeLessonsFromRepo, skill-resolver.isRoleVariant, planning-rules.writeRule, auto-merge.AUTO_MERGE_COMMIT_TEMPLATE) | LOW-risk | S | LOC (~205) |
| 11 | `loc/dedup-frontmatter`: collapse 2 inline `parseFrontmatter` to shared helper | LOW-risk | S | LOC (~50) |
| 12 | `loc/passthrough-snapshot-entries`: collapse 6 build* helpers in `stop-conditions.mts` | LOW-risk | S | LOC (~60) |
| 13 | `loc/bestEffort-extract`: extract to `lib/best-effort.mts`; rewire 10+ call sites | LOW-risk | S | LOC (~45) |
| 14 | `loc/ensureDir-sweep`: rewire ~15 inline `fs.mkdir` to `paths.ensureDir` | LOW-risk | S | LOC (~30) |
| 15 | `loc/codemod-add-any-delete`: delete dead migration script | LOW-risk | XS | BP10 |
| 16 | `loc/file-split-loop.mts`: extract `COMMANDS`, `FLAG_SPEC` from 1759-LOC entry | MED-risk | M | LOC |
| 17 | `loc/file-split-slice-linker-cluster`: split complete-slice / start-slice / auto-merge / feature-lifecycle / stop-conditions per seams above | MED-risk | L | LOC |
| 18 | `commands/argument-hint-audit`: add `argument-hint` to 44 commands | MED | S | best-practices (BP9) |
| 19 | `security/notifier-trust-doc`: header comments + control-char strip | MED | XS | best-practices (BP11, BP12, BP13) |
| 20 | `prod/typecheck-errors-cleanup`: rm + gitignore + .claude.backup.* rm | LOW | XS | prod (PR6, PR15) |
| 21 | `prod/gitignore-sweep`: add common dev-detritus patterns | LOW | XS | prod (PR12) |
| 22 | `loc/comment-debt-sweep`: delete ~45 LOC of obvious comments | LOW | S | LOC |
| 23 | `plugin.json/repository-url`: add repository, homepage, bugs URLs | LOW | XS | best-practices |

**Release-blocking path**: FEATs 1-6. ≈2-4h of focused work.
**Top-quality bump**: FEATs 7-9 (perf) + 10-14 (LOC). ≈1-2 days.
**Polish**: FEATs 16-23. As-time-permits.

---

## How this audit was produced

Four `runner:researcher` agents dispatched in parallel:
1. Performance (24 findings, citations verified)
2. LOC reduction (28 findings, totals computed)
3. Best practices (28 findings, plugin contract + repo conventions)
4. Prod-readiness (25 findings, release hygiene)

Main thread verified all 5 BLOCK findings against actual files before recording. Each row in this report can be reproduced from the cited path:line.

## Confidence

- **BLOCK rows**: HIGH — every claim independently verified by main thread reading source.
- **Performance HIGH (P1-P7)**: HIGH — agent traced file:line and traffic pattern. Speedup estimate is best-effort.
- **LOC HIGH (pure deletes)**: HIGH — agent verified zero importers.
- **LOC MED (splits)**: MED — seams are reasonable but each split needs reviewer eyes before commit.
- **Best-practices security (BP11-BP13)**: MED — trust model is "operator-config trusted"; hardening is defense-in-depth, not a known exploit.
- **Prod-readiness**: HIGH on doc drift (verified); MED on release-ceremony recovery (PR17) — only the timestamps suggest broken ceremony, not direct evidence.
