---
decision: approved
reviewer: crew:reviewer
slice: SLICE-26
reviewed_commits: [223961b7, 474be650, 3c61b183]
supersedes: .claude/artifacts/crew/reviews/20260819T154018Z-review-result-slice-26-migrate-adopter.md
---

# Re-review — SLICE-26 migrate-adopter.mts (post loop:-marker fix)

## Summary

Prior review (`20260819T154018Z`, `needs_fix`) found a HIGH defect: a third
legacy marker pair (`<!-- loop:start -->...<!-- loop:end -->`, from an
older "Wiggin Loop" installer) was unrecognized by `replaceMarkerBlocks`,
leaving a duplicate, half-rewritten "Autonomous Loop — HARD RULES" block in
6-7 adopters. The fix (`3c61b183`) adds `loop:start`/`loop:end` to
`LEGACY_MARKER_PAIRS` and to `hasLegacyMarkerBlock`'s enumeration check.
Independently re-verified below via test-suite round-trip (reverting the
fix and confirming failures), direct file inspection of all 6 repaired
adopters, `sales`'s exoneration, and the two newly-discovered adopters
(`citylive`, `devops`). One additional pre-existing, out-of-scope issue was
found in `sales` (documented below) — not a blocker. **Decision: approved.**

## Re-verification performed

### (a) Regression tests genuinely catch the bug

Temporarily reverted `migrate-adopter-markers.mts` and `migrate-adopter.mts`
to their pre-loop:-fix state (`git show 474be650:...` /
`git show 223961b7:...`, copied over the working files) and re-ran
`migrate-adopter.test.mts`: **21 pass, 4 fail** — the exact 4 new tests
failed with the expected assertion errors (`loop:start` span not removed;
`/crew:build` token surviving verbatim; `enumerateAdopters` returning `[]`
instead of the loop:-only adopter). Restored the fixed files
(`git diff --stat` confirmed a clean working tree afterward) and re-ran:
**25 pass, 0 fail**. This is a genuine, independently-reproduced regression
test, not a rubber-stamped one.

### (b) Round-tripped 4 of the 6 repaired adopters + sales directly

`bun src/scripts/migrate-adopter.mts --repo <path> --dry-run` on
`authentic`, `memory`, `runner`, and `sales`: all four report
`CLAUDE.md: no change` / `config: {"action":"already-migrated"}` — zero-diff
confirmed independently, not just trusting the ledger's self-reported
idempotence table.

Direct grep across all 7 (6 repaired + `sales`) for marker/content shape on
the live files:

```
              devcrew:start  devcrew:end  legacy runner:/crew:  loop:start  Wiggin Loop
authentic          1             1              0                  0            0
common              1             1              0                  0            1 (unrelated ADR-index prose, not a HARD RULES block — see below)
marketing           1             1              0                  0            0
memory              1             1              0                  0            0
raskraska           1             1              0                  0            0
runner               1             1              0                  0            0
sales                1             1              0                  0            1 (see finding below — pre-existing, out of scope)
```

`common`'s one "Wiggin Loop" hit: line 48, a cross-cutting ADR-index bullet
("Azure-only, YARP-as-sole-ingress, ..., **Wiggin Loop**, two-reviewer
rule, ...") — a decision-topic name in prose, not a leftover HARD RULES
block. Confirmed by reading the surrounding lines. Matches the ledger's
claim exactly.

### (c) `citylive` + `devops` — engineering-os block preserved, single devcrew block, idempotent

Both show exactly `engineering-os:start`/`end` (marker literal itself
untouched) with the *token inside its comment* correctly rewritten from
`/crew:install` to `/devcrew:install`, plus exactly one `devcrew:start/end`
block and zero `runner:`/`crew:`/`loop:` leftovers. `--dry-run` on both
reports `CLAUDE.md: no change` — genuinely idempotent, independently
confirmed, not re-derived from the ledger's table.

### (d) Test suites

`bun test src/tests/migrate-adopter.test.mts` → **25 pass, 0 fail**
(matches ledger; also matches `grep -c '^test(' ...` = 25, so the count
itself is now accurate — the prior review's LOW finding about the 24-vs-21
mismatch is correctly fixed in this ledger revision, which explicitly notes
the correction).
`bun test src/tests/dispatcher-config.test.mts` → **3 pass, 0 fail**.

### (e) Ledger accuracy spot-check

The ledger's "Correction to the review's repo list" section (sales
exoneration, actual set = 6 not 7) is accurate — confirmed independently via
`git log` on `sales/CLAUDE.md`, which shows the duplicate HARD-RULES text
predates this slice's migration entirely (already present, unwrapped by any
marker, in the unrelated `89de31a docs: agentic-setup rebuild` commit before
`migrate-adopter.mts` ever touched the file). The fix commit message and the
ledger's fix/repair-pass narrative both check out against the actual diffs
inspected (`git show 3c61b183`).

## New finding (not a blocker)

### [LOW / follow-up] `sales` carries a pre-existing, unmarked duplicate HARD-RULES section this script cannot and should not try to fix

`C:\work\mega\sales\CLAUDE.md` has a correctly-migrated `devcrew:start/end`
block (lines 92-110) immediately followed by a second, unmarked
`## Autonomous Loop — HARD RULES (summary)` section (lines 114+, no marker
wrapper of any kind — not `crew:`, not `runner:`, not `loop:`) that still
says "This repo runs the Wiggin Loop autonomously" and references dead
`/loop:slice start`, `/loop:phase-gate`, `/loop:slice complete` commands.
Traced via `git log`/`git show`: this orphan section already existed,
already unwrapped, before this migration ever ran (introduced by an
unrelated prior commit, `89de31a`, "agentic-setup rebuild — altitude
model"). `migrate-adopter.mts` correctly left it alone except for its
in-scope, documented behavior — the whole-file dispatch-token rewrite did
touch `/crew:build`→`/devcrew:build` and `/crew:fix`→`/devcrew:fix` inside
it (correct, since those are recognized `crew:`/`runner:` slash tokens
wherever they appear, per the token module's documented contract) — but
`/loop:*` tokens are a different namespace this migration was never
chartered to rename, so they remain as dead references.

This is **not a regression introduced by SLICE-26** and is **not covered by
AC-1's scope** (marker blocks + dispatch tokens outside them + config
files) — `replaceMarkerBlocks` operates on marker literals, and this
content was never wrapped in one, so there is no span for it to collapse.
Fixing it would require heuristic duplicate-content detection, a materially
different and unbounded capability this script doesn't claim. Recommend
filing a follow-up FEAT/chore for a manual cleanup pass on `sales`'s
CLAUDE.md (and possibly auditing other adopters for similar unwrapped
legacy duplicates predating any `/runner:install`/`/crew:install`/
`/loop:install` marker convention) — does not block this slice.

## Findings carried over from the prior review, reconfirmed still valid

- AC-2 fix (`474be650`) and its round-trip: reconfirmed accurate (already
  independently verified in the prior review pass; not re-derived here).
- `kb` skip, config migration (`schemaVersion: 2` + byte-identical `.bak`),
  `resolveConfig` boundary compliance, no marketplace write path (AC-3):
  all previously verified and unaffected by this fix round.

## Decision rationale

`approved`. The reviewer-caught HIGH defect (unrecognized `loop:` marker
pair) is fixed with a minimal, correctly-scoped change, backed by 4 new
regression tests I independently confirmed fail on the pre-fix code and
pass on the fix. All 6 previously-affected adopters are verified clean by
direct file inspection (not just script self-report), `sales`'s exoneration
from that specific defect is verified accurate, and the two newly-discovered
adopters (`citylive`, `devops`) are migrated correctly with the
deliberately-preserved `engineering-os:` block intact. Both test gates
(`migrate-adopter.test.mts` 25/25, `dispatcher-config.test.mts` 3/3) pass on
independent re-run. The one new issue found (`sales`'s pre-existing,
unmarked duplicate content) predates this slice, is outside AC-1's stated
scope, and does not warrant blocking — flagged as a follow-up instead.
