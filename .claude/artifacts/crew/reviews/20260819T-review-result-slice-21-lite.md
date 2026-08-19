---
decision: approved_with_notes
slice: SLICE-21
artifact: docs/planning/gepa-disposition.md
reviewer: lite-review (spot check)
date: 2026-08-19
---

# Lite review — SLICE-21 GEPA disposition table

Scope: spot-verify closure logic on 5 rows (2 KEEP, 3 DELETE) plus the
command → handler chain. This is a read-only accuracy check of the trace
artifact; SLICE-21 makes no deletions itself.

## Command → handler chain (verified accurate)

Checked `crew/scripts/crew.mts` directly against the table at
`docs/planning/gepa-disposition.md:18-22`:

- `commands/gepa-eval.md` → `"gepa-eval"` handler key at `crew.mts:1457`,
  dynamic import `./lib/gepa/eval.mjs` at `crew.mts:1458`
  (`runGepaEvalCmd`) — matches.
- `commands/gepa-history.md` → `"gepa-history"` handler key at
  `crew.mts:1401`, import `./lib/gepa/history.mjs` — matches exactly.
- `commands/gepa-invalidate.md` → `"gepa-invalidate"` handler key at
  `crew.mts:1507`, import `./lib/gepa/gepa-killswitch-cmds.mjs`
  (`runGepaInvalidateCmd`) — matches exactly.

All three doc-cited line numbers are correct or land on the adjacent import
line within the same handler block. Chain is real, not asserted.

## KEEP rows spot-checked

**#4 `gepa-killswitch-cmds.mts`** — confirmed. Real dynamic imports at
`crew.mts:1499` (`gepa-resume`), `1508` (`gepa-invalidate`), `1521`
(`gepa-revert`), `1532` (`gepa-thaw`), plus 4 test files
(`gepa-invalidate.test.mts`, `gepa-resume-global.test.mts`,
`gepa-revert.test.mts`, `gepa-thaw.test.mts`). Matches row #4 evidence.

**#6 `observability-events.mts`** — imported-by chain is **incomplete as
documented**. Row #6 says "Imported by `gepa-killswitch-cmds.mts`" only.
Grep confirms that import is real (`gepa-killswitch-cmds.mts:27`), but there
is a second, real, non-comment importer the row omits:
`crew/scripts/lib/gepa/auto-merge-gate.mts:40-45` imports `emitGepaEvent`,
`emitCriticalAgentDraftPrEvent`, `emitOptPromoteEvent`,
`emitTailRiskBlockEvent` from `./observability-events.mjs`. `auto-merge-gate.mts`
is DELETE-tier (row #8). This doesn't change the DELETE verdict for
`auto-merge-gate.mts` or endanger `observability-events.mts` (deleting the
importer of a surviving file is safe), but it does contradict the closure
trace section (lines 31-33): "none of the 21 import anything from the 6...
the cut is structurally clean" is **false as stated**.

## Second instance of the same closure-claim defect (found while checking, not part of the assigned 5)

`crew/scripts/lib/gepa/gepa-optimize-cmd.mts` (row #20, DELETE) has a real,
substantive import from `no-winner-streak-tracker.mts` (row #5, KEEP) —
`checkStreakHalt`, `incrementStreak`, `resetStreak`, `NO_WINNER_STREAK_HALT`
at `gepa-optimize-cmd.mts:34-39`. Row #20's evidence only notes that a
*test* (`optimize-no-winner-streak.test.mts`) imports both tiers; it doesn't
mention that `gepa-optimize-cmd.mts` itself does. This is a second,
independent violation of the same "zero imports either direction" claim.

Checked the remaining three KEEP leaves for the same pattern —
`eval.mts`, `run-with-lock.mts`, `history.mts` — no stray DELETE-set
importers found for any of them. So the closure-claim defect is confined to
exactly two KEEP files (`observability-events.mts`,
`no-winner-streak-tracker.mts`), each with exactly one DELETE-tier importer
(`auto-merge-gate.mts`, `gepa-optimize-cmd.mts` respectively).

**Impact: none on deletion safety.** Both violations run DELETE→KEEP, the
harmless direction — removing the importer doesn't touch the surviving
file. All sampled KEEP/DELETE verdicts remain correct. This is a
documentation-accuracy defect in the "closes cleanly, zero imports either
direction" framing (`docs/planning/gepa-disposition.md:31-33`), not a defect
in the disposition verdicts themselves.

## DELETE rows spot-checked

**#9 `auto-pr.mts`** — confirmed. Only real import is
`optimize-runner.mts:29` (`runAutoPr`, `printManualCommands`, `GhAuthError`,
`AutoPrResult` — DELETE-tier, matches doc). Other hits are comments
(`branch-protection-check.mts`, `corpus-optimize.mts`, `corpus-report.mts`)
or `optimize-runner.mts`'s own second reference. Own test
(`auto-pr-shape.test.mts`) confirmed. No missed external importer.

**#17 `corpus-report.mts`** — confirmed. Real importer is
`corpus-optimize.mts:27` (type + `98` dynamic-import re-export, both
DELETE, matches doc). `crew.mts:1437` also imports it directly for the
`gepa-corpus-report` subcommand — this is the already-documented
"cross-cutting" caveat in the doc's paragraph after the cautions table (doc
says 5 `crew.mts` subcommands still dynamic-import soon-to-be-deleted
files), so it's correctly accounted for, just not repeated in row #17's own
evidence cell. No undisclosed external importer.

**#26 `soak-dispatcher-hook.mts`** — confirmed exactly as documented. Sole
outside importer is `crew/scripts/lib/slice-linker/dispatch.mts:65`, a real
static import (`} from "../gepa/soak-dispatcher-hook.mjs";`), matching the
"external caution" row precisely. Own test confirmed.

## Verdict

**approved_with_notes.** The command→handler chain is verified correct end
to end, and all 5 assigned spot-check rows (plus 2 extra KEEP leaves checked
opportunistically) have accurate DELETE/KEEP verdicts and accurate
"external caution" callouts where present — nothing in the cautions table is
missing an importer, and nothing outside it turned out to secretly need one.

The one real defect: the closure-trace section
(`docs/planning/gepa-disposition.md:24-33`) claims the 6-file KEEP closure
"closes cleanly... none of the 21 import anything from the 6... the cut is
structurally clean." That's false — two DELETE-tier files
(`auto-merge-gate.mts`, `gepa-optimize-cmd.mts`) have real, substantive
imports from two KEEP-tier files (`observability-events.mts`,
`no-winner-streak-tracker.mts`). It doesn't change any verdict or endanger
SLICE-22's execution (DELETE→KEEP imports vanish harmlessly when the DELETE
file is removed), but the artifact should not assert bidirectional
zero-coupling when the coupling is real and one-directional. Recommend a
one-line correction to lines 31-33 before SLICE-22 treats this trace as
literal ground truth.
