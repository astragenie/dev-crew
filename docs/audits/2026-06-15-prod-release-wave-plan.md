# Prod-release wave plan — loop next

**Companion to**: `2026-06-15-prod-release-audit.md`
**Mode**: wave-mode (`loop.marathonRunner: "wave"`)
**Constraint**: every FEAT inside the same wave has **disjoint `touches_files`** sets — auto-merge cannot deadlock.

## Milestone gates (sequential)

```
M1 Release blockers ─► M2 Cleanup ─► [TAG v0.51.0]
                                          │
                                          ├─► M3 LOC pure deletes ─┐
                                          ├─► M4 Perf hot paths ───┤
                                          │                        │
                                          ▼                        ▼
                              M5 LOC file splits ─► [TAG v0.52.0] ─► M6 Polish
```

- **M1+M2 MUST complete before tag.** Anything else can ship post-tag in a `0.52.x` patch train.
- **M3 parallel-safe with M4** (disjoint files).
- **M5 absorbs comment-debt + several MED LOC items** at split time (cheaper to combine).
- **M6 last** — polish + post-release housekeeping.

## Wave-conflict rules

1. Two FEATs in the same wave MUST have empty `intersect(touches_files)`.
2. A FEAT that depends on another (e.g. F12 absorbs F1's bump) goes in a LATER wave.
3. A FEAT splitting a file (M5) BLOCKS all later FEATs touching that file until merged.

---

## M1 — Release blockers (Wave 1, size 5, ≈2-4h)

All 5 disjoint. Run one wave.

| FEAT | Title | touches_files | Effort | Severity | Notes |
|---|---|---|---|---|---|
| **F1** | Version + CHANGELOG ceremony | `package.json`, `.claude-plugin/plugin.json`, `CHANGELOG.md` | S | BLOCK | Add `## [0.51.0] — 2026-06-15 — Wave-mode autonomous loop` header above orphan `### Added`. Bump both manifests to 0.51.0. Add `## [Unreleased]` placeholder. |
| **F2** | README + ADOPTION sweep | `README.md`, `ADOPTION.md` | S | BLOCK | Crew floor → `>= v0.31.1`. Architecture section → `src/scripts/*.mts`. Test invocation → bun. Drop "22 tests" claim. Direct-invocation example → `bun src/scripts/loop.mts`. Commit example → `<version>` placeholder. |
| **F3** | Hooks correctness | `hooks/version-check.mjs`, `hooks/bootstrap-context.mjs` | XS | BLOCK | `version-check`: `console.warn` → `process.stdout.write`. Marketplace path → `astra-marketplace`. `bootstrap-context`: `crew:inspector/verifier` → `crew:reviewer/validator`. Drop stale `docs/ai-loop/...` paths. |
| **F4** | Owned-agent sweep | `agents/pm.md`, `agents/architect.md`, `agents/researcher.md`, `agents/spec-writer.md`, `agents/document-writer.md`, `agents/market-researcher.md`, `agents/hierarchical-dispatcher.md` | S | HIGH | PM allowlist sync (`+marathon-checkpoint`, `+orchestrator-mode`, `-decommissioned-roles`). PM commands string fix. CI path `src/scripts/validate-decline-citations.mts`. 5 owned agents: add `model:` field. document-writer H1 rename. hierarchical-dispatcher drop `scripts/loop.mjs`. |
| **F5** | Command-doc path fixes | `commands/snapshot-memory.md`, `docs/halt-badges.md`, `CLAUDE.md` | XS | BLOCK | snapshot-memory cmd: `docs/loop-snapshot.md` → `.claude/artifacts/loop/loop-snapshot.md` (3 occurrences). halt-badges.md: `node scripts/loop.mjs` → `bun src/scripts/loop.mts`. CLAUDE.md: drop `product-backlog.md` reference or restore file. |

**Gate to M2**: all 5 PASS auto-merge. Run full test suite + manifest + content-length + format:check.

---

## M2 — Cleanup + hygiene (Wave 2, size 5, ≈1-2h)

| FEAT | Title | touches_files | Effort | Severity | Notes |
|---|---|---|---|---|---|
| **F6** | Repo cruft purge | `.gitignore`, delete `typecheck-errors.txt`, delete `.claude.backup.20260524T215027Z/`, delete `package-lock.json` | XS | MED | `.gitignore` += `typecheck-errors.txt`, `*.log`, `.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`. Bun runtime → npm lockfile dead. |
| **F7** | Dead-code file delete | delete `src/scripts/codemod-add-any.mts` | XS | MED | Port complete (FEAT-021). File ships with `: any` literals + `execSync npx tsc`. Verify no importer first. |
| **F8** | Manifest metadata expand | `.claude-plugin/plugin.json`, `package.json` | XS | LOW | plugin.json += `repository`, `homepage`, `bugs` + keywords (`wave-mode`, `parallel-dispatch`, `git-worktree`). package.json += `description`, `repository`, `author`, `license`. **Blocked by F1** (don't conflict on version line). |
| **F9** | Backlog state hygiene | triaged FEAT files + `.claude/artifacts/loop/loop-snapshot.md` | S | MED | Run `/loop:retriage --include-triaged` to add `touches_files` to 5 triaged FEATs. Regen snapshot via `/loop:snapshot-memory`. Audit `v0.44.0`→`v0.50.1` release ceremony recovery. |
| **F10** | Tests + stubs audit | `worktree-manager.test.mts`, `src/scripts/loop.mts`, `src/scripts/lib/grade-parser.mts`, `src/scripts/lib/task-store/setup-writer.mts` | XS | MED | 3× `TODO(2026-09-11)` stub audit — close if obsolete, else leave with FEAT-NNN tracking. Skipped test L617: delete or attach tracking. |

**Gate to TAG**: F1+F8 sequenced (same files). Verify all tests + lint + format. Bump version. Tag `v0.51.0`. Push.

---

## TAG v0.51.0 — ship line

Everything after this point is post-release patch-train work. Loop continues operating during M3-M6.

---

## M3 — LOC pure deletes (Wave 3, size 4, ≈3-5h)

All zero-importer drops. Each FEAT verified by grep before merge.

| FEAT | Title | touches_files | LOC | Risk |
|---|---|---|---|---|
| **F11** | Dead exports purge | `src/scripts/lib/loop-installer-tokens.mts`, `src/scripts/lib/grade-parser.mts`, `src/scripts/lib/plugin-identity.mts`, `src/scripts/lib/lessons-ratchet.mts`, `src/scripts/lib/skill-resolver.mts`, `src/scripts/lib/planning-rules.mts`, `src/scripts/lib/auto-merge.mts` | ~205 | low |
| **F12** | parseFrontmatter dedup | `src/scripts/lib/cost-alert-loader.mts`, `src/scripts/lib/slice-cost-ceiling.mts` | ~50 | low |
| **F15** | ensureDir sweep | 15 inline call-sites (see audit) — list via `git grep "mkdir.*recursive"` first | ~30 | low |
| **F17** | Slug helpers unify | new `src/scripts/lib/slug.mts`, rewire `src/scripts/lib/slice-linker/feature-lifecycle.mts`, `src/scripts/lib/lessons-ratchet.mts`, `src/scripts/lib/artifact-naming.mts` | ~20 | med |

F11 + F12 + F15 + F17 disjoint after careful file selection. Wait — F11 touches `auto-merge.mts`, M5 will split `auto-merge.mts` → must merge F11 BEFORE F26.

**Sequencing**: M3 → M5 (M3 changes land first, then M5 splits clean post-delete file).

---

## M4 — Perf hot paths (Wave 4 + Wave 5, ≈1 day)

### Wave 4 (size 4, parallel-safe)

| FEAT | Title | touches_files | Speedup | Risk |
|---|---|---|---|---|
| **F18** | auto-walker hoist (P1) | `src/scripts/lib/auto-walker.mts` | 30-40% on 100-slice walks | M |
| **F19** | Wave planner dedup (P2+P3) | `src/scripts/lib/wave/planner.mts`, `src/scripts/lib/wave/touches-files.mts` | 10-20% per wave plan | S |
| **F21** | Parallel worktree adds (P5) | `src/scripts/lib/hierarchical-dispatch.mts` | N×serial → 1×parallel for N children | L |
| **F22a** | parallelReadDir helper | new `src/scripts/lib/parallel-read-dir.mts`, NO consumer changes yet | — | S |

### Wave 5 — parallelReadDir consumers (size 4)

After F22a lands, apply to consumers. **Sequence F22a→W5.**

| FEAT | Title | touches_files | LOC saved | Risk |
|---|---|---|---|---|
| **F22b** | Apply to backlog + spec + grade readers | `src/scripts/lib/grade-parser.mts`, `src/scripts/lib/spec-parser.mts`, `src/scripts/lib/artifact-linker.mts` | ~20 | S |
| **F22c** | Apply to stop-condition + cost readers | `src/scripts/lib/cost-alert-loader.mts`, `src/scripts/lib/redundant-read-detector.mts`, `src/scripts/lib/marathon-checkpoint.mts` | ~15 | S |
| **F22d** | Single-pass filter helpers | `src/scripts/lib/brief.mts`, `src/scripts/lib/memory-snapshot.mts`, `src/scripts/lib/pattern-alerts.mts`, `src/scripts/lib/slice-linker/dispatch.mts`, `src/scripts/lib/slice-linker/crew-bridge.mts`, `src/scripts/lib/slice-linker/feature-lifecycle.mts` | ~25 | M |
| **F20** | In-process stop-check (P4) | `src/scripts/lib/wave/real-deps.mts` | 200-500ms × N waves | M |

F20 may conflict with F18 if both modify the stop-check entry surface — F20 must read post-F18 state.

**Conflict watch in W4/W5**:
- F22d touches `feature-lifecycle.mts` AND M5 F27 splits it → sequence: M3 → M4 → M5.
- F22d touches `crew-bridge.mts` AND M5 F29 splits it → same sequence.
- F22c touches `marathon-checkpoint.mts` (no M5 split planned) → safe.

---

## M5 — File splits >400 LOC (Wave 6 + Wave 7, ≈2-3 days)

Each split = one owner. Wave 6 + 7 disjoint files.

### Wave 6 (size 4)

| FEAT | Split target | Resulting modules | Absorbs |
|---|---|---|---|
| **F23** | `src/scripts/loop.mts` (1759 → ~400) | + `lib/commands.mts` (~350), + `lib/flag-spec.mts` (~80) | F16 comment debt |
| **F26** | `src/scripts/lib/auto-merge.mts` (792) | + `lib/auto-merge-pipeline.mts`, + `lib/auto-merge-state.mts` | — |
| **F28** | `src/scripts/lib/stop-conditions.mts` (596) | + `lib/stop-conditions-signals.mts` | F13 passthrough collapse + F37 wave-badges wire |
| **F31** | `src/scripts/lib/artifact-linker.mts` (422) | + `lib/artifact-collectors.mts` | — |

### Wave 7 (size 4)

| FEAT | Split target | Resulting modules | Absorbs |
|---|---|---|---|
| **F24** | `src/scripts/lib/slice-linker/complete-slice.mts` (959) | + `complete-slice-stages.mts` | F14 bestEffort extract (half) |
| **F25** | `src/scripts/lib/slice-linker/start-slice.mts` (745) | + `start-slice-state.mts` | F14 bestEffort extract (other half) |
| **F27** | `src/scripts/lib/slice-linker/feature-lifecycle.mts` (603) | + `feature-materialize.mts`, + `feature-simplify.mts` | — |
| **F29** | `src/scripts/lib/slice-linker/crew-bridge.mts` (553) | + `synthesis-writer.mts` | — |

### Wave 8 (size 2)

| FEAT | Split target | Resulting modules |
|---|---|---|
| **F30** | `src/scripts/lib/slice-linker/agent-report-writer.mts` (530) | + `agent-report-render.mts` |
| **F32** | `src/scripts/lib/phase-gate.mts` (420) | + `phase-gate-posthooks.mts` |

**Sequence inside M5**: F23 first if any wave-7 FEAT imports new `commands.mts` paths. Otherwise W6 ‖ W7 ‖ W8 parallel-safe.

---

## M6 — Polish + post-release (Wave 9, size 4)

| FEAT | Title | touches_files | Severity |
|---|---|---|---|
| **F33** | `argument-hint` audit across commands | `commands/*.md` (44 files, chunk into 4 sub-features by alpha range: a-c, d-l, m-r, s-z) | MED |
| **F34** | Security trust-model hardening | `src/scripts/lib/event-notifier.mts`, `src/scripts/lib/wave/real-deps.mts`, `src/scripts/lib/wave/config.mts` | MED |
| **F35** | Comment debt sweep (whatever M5 didn't absorb) | `src/scripts/lib/auto-walker.mts`, `src/scripts/lib/loop-installer-scaffold.mts`, `src/scripts/lib/memory-snapshot.mts`, `src/scripts/lib/marathon-checkpoint.mts` | LOW |
| **F36** | Stale skipped-test ticket | `src/tests/worktree-manager.test.mts` | LOW |

F33 sub-split (4 features) can run in one wave since each owns disjoint command-file ranges.

---

## Wave size cap

`loop.json:wave.size` recommended values:
- M1, M2, M6: **5** (small risk per FEAT, max parallel)
- M3: **4** (file-touch matrices need care)
- M4: **4** (perf wins want independent benchmarks)
- M5: **3** (each split is reviewer-heavy)

## maxIterations budget

Wave-mode counts each wave as 1 iteration. Total waves: ~9. Set `loop.maxIterations` ≥ 12 (slack) or `--max-waves 9`.

## Reviewer ladder

- M1, M2: default `["A","B"]` — small surface, two reviewers fine.
- M3: default. Pure deletes.
- M4: **`multidim` preset** — perf changes span correctness + test-coverage + conventions.
- M5: **`multidim` preset** — file splits are high-risk for hidden coupling.
- M6: default.

## Dependency graph (TL;DR)

```
W1(F1..F5) ─► W2(F6..F10) ─► TAG ──┐
                                   │
                            ┌──────┴──────┐
                            ▼             ▼
                       W3(M3 deletes)  W4(M4 perf)
                            │             │
                            ▼             ▼
                            └─►  W5(F22b..d,F20)
                                    │
                                    ▼
                            W6+W7+W8 (M5 splits) ─► TAG ─► W9 (M6)
```

## Per-wave dispatch command sketch

```bash
# M1
bun src/scripts/loop.mts wave plan --features "F1,F2,F3,F4,F5"
bun src/scripts/loop.mts wave run

# M2 (after M1 PASS)
bun src/scripts/loop.mts wave plan --features "F6,F7,F8,F9,F10"

# Or full marathon
bun src/scripts/loop.mts wave loop --max-waves 12
```

## Total estimated effort

| Milestone | Wall-clock (autonomous wave-mode, no human review) | Wall-clock (with default human review at gates) |
|---|---|---|
| M1 | 2-4h | 4-6h |
| M2 | 1-2h | 2-3h |
| **TAG v0.51.0** | — | — |
| M3 | 3-5h | 6-8h |
| M4 | 1 day | 1.5 days |
| M5 | 2-3 days | 3-4 days |
| M6 | 4-6h | 1 day |
| **Total** | **~5 days** | **~7-8 days** |

## Risk register

| Risk | Mitigation |
|---|---|
| M5 file-splits introduce import-cycle | Run typecheck on each child branch BEFORE auto-merge gate; reject on TS2305/TS2691 |
| F22b-d parallelReadDir applied with bad mtime cache invalidation | Cover with `lib/parallel-read-dir.test.mts` BEFORE F22b-d ship |
| F20 in-process stop-check breaks `crew:fix` hand-off | Wire integration test against wave-mode dry-run before merge |
| F33 command sub-splits race on shared `argument-hint` schema | Define schema once in F33-prep, then sub-feature dispatch |
| Tag ceremony broken (per audit PR17 / v0.44 → v0.50.1 gap) | F1 includes `bump-version` invocation audit; restore tag history if missing |
