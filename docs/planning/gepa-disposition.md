# GEPA disposition trace — SLICE-21 (FEAT-005 P4)

Import-closure trace for `crew/scripts/lib/gepa/` (27 files, 6,145 LOC).
**This is a trace only — no deletions happen here.** SLICE-22 executes the
verdicts below.

Rule applied (plan §5, corrected by demolition review): default **DELETE**
for all 27 files. **KEEP** = the import closure of the three surviving
command docs (`commands/gepa-eval.md`, `gepa-history.md`,
`gepa-invalidate.md`) → the crew CLI subcommand handlers they invoke in
`crew/scripts/crew.mts` → those handlers' transitive `./`-relative imports
within `lib/gepa/`. Nothing in the evals harness (`crew/evals/`) imports from
`lib/gepa/` (it consumes `@astragenie/gepa-core` directly), so that clause
contributes zero extra keeps.

## Command → handler → closure trace

| Command doc | Dispatches to (`crew.mts`) | Handler file |
|---|---|---|
| `commands/gepa-eval.md` | `gepa-eval` | `lib/gepa/eval.mts` (`runGepaEvalCmd`) |
| `commands/gepa-history.md` | `gepa-history` | `lib/gepa/history.mts` (`runGepaHistoryCmd`) |
| `commands/gepa-invalidate.md` | `gepa-invalidate` | `lib/gepa/gepa-killswitch-cmds.mts` (`runGepaInvalidateCmd`) |

Transitive `./`-relative imports:

- `eval.mts` → `run-with-lock.mts` (lock wrap) → (gepa-core only, leaf)
- `history.mts` → (gepa-core only, leaf)
- `gepa-killswitch-cmds.mts` → `no-winner-streak-tracker.mts` (leaf) +
  `observability-events.mts` (leaf)

Closure is **6 files**, and it closes cleanly — none of the 6 import
anything from the other 21, and none of the 21 import anything from the 6.
> CORRECTION (lite review 20260819T): the cut is clean in the direction that
> matters — no KEEP file imports any DELETE file. Two DELETE files DO import
> KEEP files (auto-merge-gate.mts -> observability-events; gepa-optimize-cmd.mts
> -> no-winner-streak-tracker) — harmless: deleting the importers removes those
> edges. The earlier "zero imports either direction" claim was false.

## Disposition table (all 27 files)

| # | File | LOC | Verdict | Evidence |
|---|---|---:|---|---|
| 1 | `eval.mts` | 145 | **KEEP** | Direct handler for `gepa-eval` (crew.mts:1458). Spawns `bun run evals`; does not call gepa-core directly (goes through `run-with-lock`). Not a thin re-wrap — owns arg parsing, child-process spawn/collect, exit-code mapping. |
| 2 | `run-with-lock.mts` | 79 | **KEEP** | Imported by `eval.mts` only. Wraps `fileLockManager` from gepa-core with CLI-specific (agent, phase) lock semantics and an `ok`/`lock_held`/`error` outcome shape gepa-core doesn't provide — not a mere re-export, no further shrink candidate. |
| 3 | `history.mts` | 57 | **KEEP** | Direct handler for `gepa-history` (crew.mts:1401). Thinnest of the kept files (arg parse + `fileStore(...).recall()` + table format) but still owns CLI surface (flags, error shape, table rendering) gepa-core doesn't provide — not pure re-export. |
| 4 | `gepa-killswitch-cmds.mts` | 510 | **KEEP** | Direct handler for `gepa-invalidate` (crew.mts:1507, `runGepaInvalidateCmd`). Also exports `runGepaRevertCmd`/`runGepaThawCmd`/`runGepaResumeCmdExtended` — those three back the `gepa-revert`/`gepa-thaw`/`gepa-resume` crew.mts subcommands (crew.mts:1498/1520/1531) even though those commands' `.md` docs are already gone from `commands/`. Keeping the whole file is correct (gepa-invalidate needs it) and keeps those three subcommands functional as a side effect. Substantial original logic (AND-semantics filter fix over gepa-core's OR-only `invalidate`, git-revert-never-reset flow, atomic config rewrites) — not a re-wrap. |
| 5 | `no-winner-streak-tracker.mts` | 114 | **KEEP** | Imported by `gepa-killswitch-cmds.mts` (`resetStreak`, used in `runGepaResumeCmdExtended`). Zod-validated persisted state + atomic tmp+rename write; no gepa-core import at all — fully original, no shrink candidate. |
| 6 | `observability-events.mts` | 317 | **KEEP** | Imported by `gepa-killswitch-cmds.mts` (`emitGepaEvent`, `emitSoakRevertEvent`). Central JSONL event emitter, 21 typed emit helpers; no gepa-core import — fully original. |
| 7 | `adapt-artifact.mts` | 75 | DELETE | Only referenced by its own test (`crew/tests/gepa/adapt-artifact.test.mts`) and by `capture-tee.mts` (DELETE-tier). Nothing outside the DELETE cluster touches it. |
| 8 | `auto-merge-gate.mts` | 345 | DELETE | Referenced by `optimize-runner.mts` (DELETE) and its own test. Reads `gepa.config.json` `policy.*` fields — those become dead config once this is removed. |
| 9 | `auto-pr.mts` | 424 | DELETE | Referenced by `optimize-runner.mts` (DELETE, type + value import) and its own test. |
| 10 | `branch-protection-check.mts` | 199 | DELETE | Referenced by `optimize-runner.mts` (DELETE) and two tests. |
| 11 | `candidate-generator-aiplugin.mts` | 715 | DELETE | Referenced by `gepa-optimize-cmd.mts` (DELETE) and 4 tests. Largest file in the deletion set. |
| 12 | `capture-failure-trial-guard.mts` | 56 | DELETE, **external caution** | Referenced by `capture-failure-trial.mts` (DELETE) internally, but also by `crew/hooks/lib/check-subagent-return.mts` via a **dynamic** import (`await import("../../scripts/lib/gepa/capture-failure-trial-guard.mts")`, deliberately dynamic per that file's own header comment to avoid crashing hook load on a gepa-core type-strip failure). Deleting this file leaves that dynamic import dangling — SLICE-22 must also edit `check-subagent-return.mts` (remove or no-op the capture call), not just delete the gepa file. |
| 13 | `capture-failure-trial.mts` | 107 | DELETE, **external caution** | Imports `load-config.mts` + `capture-tee.mts` (both DELETE). Referenced by `crew/hooks/lib/check-subagent-return.mts` (same dynamic-import site as #12) and 2 tests. Reads `gepa.config.json` `capture.*` fields — dead config after removal. |
| 14 | `capture-tee.mts` | 151 | DELETE, **external caution** | Imports `load-config.mts` + `adapt-artifact.mts` (both DELETE). Referenced directly by `crew/scripts/lib/artifacts/write.mts` (`import type { captureTee as CaptureTeeFn }`) and by `capture-failure-trial.mts`. 4 tests import it directly or indirectly through `write.mts`. **`write.mts` (not one of the 27, lives at `crew/scripts/lib/artifacts/write.mts`) statically imports both `capture-tee.mjs` and `guarded-fire.mjs` (#20) — deleting either breaks `write.mts`'s module load, which cascades to every test that imports `write.mjs`: `write-artifact-capture-guard.test.mts`, `capture-absent-parity.test.mts`, `capture-parity.test.mts`, `capture-sigkill-parity.test.mts` (4 tests, see test table).** SLICE-22 must decouple `write.mts` from the gepa capture path before/while deleting this file. |
| 15 | `champion-provenance-writer.mts` | 144 | DELETE (explicit) | Per plan: explicitly DELETE regardless of import status — "broken provenance by design post-import." Still imported by `crew/scripts/validate-agents.mts` (`stripGepafrontmatter`) and 2 tests (`champion-provenance.test.mts`, `gepa-provenance-validate.test.mts`) plus 2 more indirectly (`validate-agents-frontmatter.test.mts`, `validate-agents-gepa-skip.test.mts` import `validate-agents.mjs`, which will fail to load once this import is dangling). SLICE-22 must edit `validate-agents.mts` in the same change. |
| 16 | `corpus-optimize.mts` | 133 | DELETE | Handler for `gepa-corpus-optimize` (crew.mts:1446) — that command's `.md` doc is already gone from `commands/`. Imports `corpus-report.mts` + `gepa-optimize-cmd.mts` (both DELETE). Own test: `gepa-corpus-optimize.test.mts`. |
| 17 | `corpus-report.mts` | 220 | DELETE | Handler for `gepa-corpus-report` (crew.mts:1436) — doc already gone. Also imported by `corpus-optimize.mts` (DELETE). Own test: `gepa-corpus-report.test.mts`. |
| 18 | `corpus-sync.mts` | 287 | DELETE | Handler for `gepa-corpus-sync` (crew.mts:1414) — doc already gone. Own test: `gepa-corpus-sync.test.mts`. |
| 19 | `critical-agent-allowlist.mts` | 29 | DELETE | Referenced only by `auto-merge-gate.mts` (DELETE) and its own test. |
| 20 | `gepa-optimize-cmd.mts` | 583 | DELETE | Handler for `gepa-optimize` (crew.mts:1484) — doc already gone. Imports `candidate-generator-aiplugin.mts`, `optimize-runner.mts`, `judge-scorer.mts`, `split-train-heldout.mts` (all DELETE). 4 tests, one of which (`optimize-no-winner-streak.test.mts`) also imports the **kept** `no-winner-streak-tracker.mts` — see test table, needs a split not a clean delete. |
| 21 | `guarded-fire.mts` | 59 | DELETE, **external caution** | Referenced by `capture-failure-trial-guard.mts` (DELETE, internal) **and** by two files outside the 27: `crew/scripts/lib/artifacts/write.mts` (`fireGuarded`) and `crew/scripts/report-to-pr.mts` (`fireGuarded`). Both are real static imports, not comments. Deleting this file breaks both of those modules' load unless SLICE-22 also edits them. Own test: `guarded-fire.test.mts`. |
| 22 | `judge-scorer.mts` | 200 | DELETE | Referenced by `gepa-optimize-cmd.mts` (DELETE) and its own test. |
| 23 | `load-config.mts` | 17 | DELETE | Thinnest file in the set — 3 lines of substance, re-exports `GepaConfigSchema`/`GepaConfig` from gepa-core plus a `loadGepaConfig` reader. Imported only by `capture-tee.mts` and `capture-failure-trial.mts` (both DELETE) and its own test. Textbook "gepa-core re-wrap" the plan's note anticipated — would have shrunk the keep-list further if anything in the KEEP set had used it, but nothing does. |
| 24 | `mine-reviewer-bug-corpus.mts` | 383 | DELETE | Handler for `gepa-mine-reviewer` (crew.mts:1471) — doc already gone. Own test: `mine-reviewer-bug-corpus.test.mts`. |
| 25 | `optimize-runner.mts` | 440 | DELETE | Imports `auto-pr.mts`, `branch-protection-check.mts`, `auto-merge-gate.mts` (all DELETE). Imported by `gepa-optimize-cmd.mts` (DELETE) and 7 tests — most-referenced file in the DELETE set. |
| 26 | `soak-dispatcher-hook.mts` | 267 | DELETE, **external caution** | No internal `lib/gepa` imports (leaf). Referenced by `crew/scripts/lib/slice-linker/dispatch.mts` (real static import, re-exported names used at dispatch time) and its own test (`soak-dispatcher-hook.test.mts`). SLICE-22 must edit `dispatch.mts` alongside this deletion. |
| 27 | `split-train-heldout.mts` | 89 | DELETE | Imported by `gepa-optimize-cmd.mts` (DELETE) only. `eval.mts`'s own header comment confirms it is **not yet wired** into the eval path ("`--split` is parsed for forward-compat but evals/cli.ts does not yet consume it") — so even though `commands/gepa-eval.md` documents a `--split` flag and cites this file under "See also," the kept `eval.mts` never calls it. Confirmed dead weight for the KEEP set. Own test: `split-train-heldout.test.mts`. |

**Totals: 6 KEEP (1,222 LOC) / 21 DELETE (4,923 LOC).**

## Cross-cutting cautions (not gepa-lib files, but touched by the deletion)

Five files outside `crew/scripts/lib/gepa/` have real (non-comment, non-test)
imports into the DELETE set. None of these were called out in the original
plan. SLICE-22 needs a companion edit in each, not just the lib/gepa deletion:

| Consumer file | Imports from DELETE set | Needed companion edit |
|---|---|---|
| `crew/scripts/lib/artifacts/write.mts` | `guarded-fire.mjs` (`fireGuarded`), `capture-tee.mjs` (type `CaptureTeeFn`) | Remove/stub the gepa capture-tee call path |
| `crew/hooks/lib/check-subagent-return.mts` | `capture-failure-trial-guard.mts` (dynamic import) | Remove/no-op the dynamic capture call |
| `crew/scripts/report-to-pr.mts` | `guarded-fire.mjs` (`fireGuarded`) | Remove/stub the guarded-fire call |
| `crew/scripts/lib/slice-linker/dispatch.mts` | `soak-dispatcher-hook.mjs` | Remove/stub the soak-hook call |
| `crew/scripts/validate-agents.mts` | `champion-provenance-writer.mjs` (`stripGepafrontmatter`) | Already anticipated by the plan (explicit DELETE note) — still needs the edit |

Additionally, `crew/scripts/crew.mts` itself still wires 5 subcommands
(`gepa-corpus-sync`, `gepa-corpus-report`, `gepa-corpus-optimize`,
`gepa-mine-reviewer`, `gepa-optimize`) to dynamic imports of files being
deleted (#16–18, #20, #24 above), even though their `commands/*.md` docs are
already gone. Those dynamic imports will 404 at runtime if invoked after
SLICE-22 unless the corresponding `crew.mts` dispatch-table entries are also
pruned. The 3 subcommands routed through the **kept** `gepa-killswitch-cmds.mts`
(`gepa-resume`, `gepa-revert`, `gepa-thaw`) are unaffected — they keep working
even without command docs.

## Test disposition (`crew/tests/gepa/*.test.mts` + top-level `gepa-*.test.mts`)

"Dies" = imports a DELETE-tier file (directly or through a broken transitive
import) and will fail to load/compile once SLICE-22 runs, absent further test
changes. "Survives" = imports only KEEP-tier files, gepa-core, or nothing
gepa-related.

| Test file | Imports | Verdict |
|---|---|---|
| `ac3-proof-harness.test.mts` | gepa-optimize-cmd, candidate-generator-aiplugin, judge-scorer, optimize-runner | Dies |
| `adapt-artifact.test.mts` | adapt-artifact | Dies |
| `auto-merge-gate-five-conditions.test.mts` | auto-merge-gate, optimize-runner | Dies |
| `auto-pr-shape.test.mts` | auto-pr, branch-protection-check, optimize-runner | Dies |
| `branch-protection-missing.test.mts` | branch-protection-check | Dies |
| `candidate-generator-aiplugin-guardrails.test.mts` | candidate-generator-aiplugin | Dies |
| `candidate-generator-aiplugin-rewriter.test.mts` | candidate-generator-aiplugin | Dies |
| `capture-absent-parity.test.mts` | `lib/artifacts/write.mjs` (→ guarded-fire, capture-tee) | Dies (indirect, via write.mts) |
| `capture-failure-trial.test.mts` | capture-failure-trial, capture-failure-trial-guard | Dies |
| `capture-parity.test.mts` | `lib/artifacts/write.mjs` (→ guarded-fire, capture-tee) | Dies (indirect) |
| `capture-perf.test.mts` | capture-tee | Dies |
| `capture-sigkill-parity.test.mts` | dynamic `import("scripts/lib/artifacts/write.mjs")` inside a spawned child | Dies (indirect) |
| `capture-tee.test.mts` | capture-tee | Dies |
| `capture-walltime.test.mts` | capture-tee | Dies |
| `champion-provenance.test.mts` | champion-provenance-writer | Dies |
| `critical-agent-allowlist.test.mts` | critical-agent-allowlist | Dies |
| `eval-cmd.test.mts` | eval | **Survives** |
| `eval-reviewer-no-circularity.test.mts` | gepa-core only + reads `agents/reviewer/.gepa/rubric.md` from repo root | **Survives** |
| `gepa-history.test.mts` | history | **Survives** |
| `gepa-invalidate.test.mts` | gepa-killswitch-cmds | **Survives** |
| `gepa-optimize-cmd-eval-cases.test.mts` | gepa-optimize-cmd, optimize-runner | Dies |
| `gepa-resume-global.test.mts` | gepa-killswitch-cmds (`runGepaResumeCmdExtended`) | **Survives** |
| `gepa-revert.test.mts` | gepa-killswitch-cmds (`runGepaRevertCmd`) | **Survives** |
| `gepa-thaw.test.mts` | gepa-killswitch-cmds (`runGepaThawCmd`) | **Survives** |
| `guarded-fire.test.mts` | guarded-fire | Dies |
| `judge-scorer.test.mts` | judge-scorer | Dies |
| `load-config.test.mts` | load-config | Dies |
| `mine-reviewer-bug-corpus.test.mts` | mine-reviewer-bug-corpus | Dies |
| `observability-event-emission.test.mts` | observability-events | **Survives** |
| `optimize-all-case-gate.test.mts` | optimize-runner | Dies |
| `optimize-artifact-only.test.mts` | gepa-optimize-cmd | Dies |
| `optimize-budget-halt.test.mts` | candidate-generator-aiplugin, optimize-runner | Dies |
| `optimize-no-winner-guard.test.mts` | optimize-runner | Dies |
| `optimize-no-winner-streak.test.mts` | no-winner-streak-tracker **+** gepa-optimize-cmd (`runGepaOptimizeCmd`, `runGepaResumeCmd`) | **Mixed — dies as written.** Tests a KEEP file and a DELETE file in one suite; needs to be split (streak-tracker assertions survive, optimize-cmd assertions die) rather than deleted or kept whole. |
| `optimize-pareto-tiebreaker.test.mts` | gepa-core only (`paretoRank`, `dominates`) | **Survives** (misfiled under `tests/gepa/` but has zero lib/gepa dependency) |
| `run-with-lock.test.mts` | run-with-lock | **Survives** |
| `soak-dispatcher-hook.test.mts` | soak-dispatcher-hook | Dies |
| `split-train-heldout.test.mts` | split-train-heldout | Dies |
| `validate-agents-frontmatter.test.mts` | `scripts/validate-agents.mjs` (→ champion-provenance-writer indirectly, but this specific test only calls `checkAgentLineCap`) | Dies (module load breaks even though the function under test doesn't touch gepa) unless `validate-agents.mts`'s champion-provenance import is fixed first |
| `validate-agents-gepa-skip.test.mts` | `scripts/validate-agents.mjs` (→ champion-provenance-writer indirectly) | Dies (same reason) |
| `write-artifact-capture-guard.test.mts` | `lib/artifacts/write.mjs` (→ guarded-fire, capture-tee) | Dies (indirect, via write.mts) |
| `crew/tests/gepa-corpus-optimize.test.mts` | corpus-optimize | Dies |
| `crew/tests/gepa-corpus-report.test.mts` | corpus-report | Dies |
| `crew/tests/gepa-corpus-sync.test.mts` | corpus-sync | Dies |
| `crew/tests/gepa-provenance-validate.test.mts` | champion-provenance-writer | Dies |
| `crew/tests/crew-write-review-result.test.mts` | not a direct gepa import (comment-only reference at line 24); spawns the CLI end-to-end | Needs manual check in SLICE-22 — likely fine since it doesn't statically import a DELETE file, but exercises `write.mts`'s CLI path so should be re-run post-deletion, not assumed clean |

**Test totals: 12 survive clean, 1 survives-but-misfiled (`optimize-pareto-tiebreaker.test.mts`), 1 mixed/needs-split (`optimize-no-winner-streak.test.mts`), 2 die-because-of-a-shared-non-gepa-file (`validate-agents-*-test.mts`) rather than importing a gepa file directly, ~29 die outright.**

## `agents/*/.gepa/` state dirs

`agents/architect/.gepa/` and `agents/reviewer/.gepa/` (each containing
`eval/` + `rubric.md`) already live at the true repo root, one level above
`crew/` — confirmed by `eval-reviewer-no-circularity.test.mts`'s own comment
("`agents/reviewer/.gepa` moved to the true repo root … `evals/agents`
legitimately stays under `crew/evals/`"). **ARCHIVE-in-place, already
relocated — no action needed in SLICE-22.**

## `gepa.config.json` fields (`crew/gepa.config.json`)

| Field | Consumed by | Disposition |
|---|---|---|
| `capture.*` (`enabled`, `exclude`, `walltime_ms`) | `capture-tee.mts`, `capture-failure-trial.mts` (both DELETE, via `load-config.mts`) | Dead config after SLICE-22 |
| `storage.*` | Not actually read by any surviving code path — `history.mts` and `gepa-killswitch-cmds.mts` both hardcode `.claude/artifacts/crew/gepa/trials` rather than reading `storage.file_root` | Already dead even today; confirm-and-drop candidate |
| `runner.backend` | `soak-dispatcher-hook.mts` (DELETE) | Dead config after SLICE-22 |
| `judge`, `judge_per_agent`, `budget.*` | Optimize-pipeline files only (`gepa-optimize-cmd.mts`, `candidate-generator-aiplugin.mts` — both DELETE); evals harness reads its own per-agent YAML specs under `evals/agents/`, not this file | Dead config after SLICE-22 |
| `optimize.paused` | `gepa-killswitch-cmds.mts` (**KEEP** — `runGepaResumeCmdExtended` reads/writes it) | **Stays live** |
| `optimize.k` | `gepa-optimize-cmd.mts` (DELETE) | Dead config after SLICE-22 |
| `policy.*` | `auto-merge-gate.mts`, `optimize-runner.mts` (both DELETE) | Dead config after SLICE-22 |
| `champion_frozen` | `gepa-killswitch-cmds.mts` (**KEEP** — `runGepaThawCmd` reads/writes it) | **Stays live** |

Net: `gepa.config.json` shrinks to two live fields (`optimize.paused`,
`champion_frozen`) post-SLICE-22; everything else in the file becomes inert
and is a candidate for a follow-up config-schema trim (out of scope for this
trace — flagging for SLICE-22 or a follow-up).
