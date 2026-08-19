---
decision: approved
slice: SLICE-24+SLICE-25
artifact: .github/workflows/ci.yml (41-gate merge) + docs/ci-gates.md + CLAUDE.md/AGENTS.md/README.md docs merge + validate-all.mts advisory-tier change (lead-applied)
reviewer: independent
date: 2026-08-19
---

## Update 2026-08-19 (post-fix spot-verify) — decision flipped to approved

Both blockers from the original pass confirmed fixed:

- `CLAUDE.md`'s `## CI gates` list now runs 1-41 matching `docs/ci-gates.md`
  exactly (spot-checked gate 1 and gates 40/41). File is 12282/12288 bytes.
  `bun ./src/scripts/generate-metrics-band.mts --check` passes and
  `README.md` now correctly publishes `| CI gates enforced | 41 |`.
- `cd crew && bunx biome format scripts/ tests/` — re-ran clean: "Checked 357
  files ... No fixes applied."

Original findings below preserved for record.

# Joint review — SLICE-24 (merged CI workflow) + SLICE-25 (docs merge) + validate-all advisory follow-up

Repo: `C:/work/mega/devcrew`, all changes uncommitted. Two blocking findings —
everything else checked out clean, including a full local execution of every
validator, all 3 tsc projects, and both test suites.

## 1. CI correctness — workflow itself is sound, one cosmetic comment drift

`.github/workflows/ci.yml` is well-structured: `fast-gate` (required check)
runs 18 root + 9 crew-blocking validators + 6 crew-advisory validators + 3 tsc
projects + 4 biome invocations; `slow-tests`/`crew-tests`/`worktree-quarantine`
run the two `bun test` suites with correct working-dir scoping (`crew/`
sub-steps consistently `cd crew &&` or use `crew/`-prefixed paths, matching
SLICE-09's nested-config design so `crew/biome.json`/`crew/tsconfig.json`
resolve as effective config rather than relying on ambiguous root
auto-discovery). `docs-only` fast-path, `gate` summary semantics, and the
worktree-quarantine hard-kill are all correctly wired. `crew/.github/workflows/`
is confirmed deleted (4 files, `git status`).

Ran locally end-to-end (excluded only the 6 documented git-worktree-hang
suites): all 18 root blocking validators pass; all 9 crew blocking validators
pass; `bunx tsc` x3 projects pass; `bunx biome lint` (root + crew) pass;
`bunx biome format src/` (root) passes. Root test suite: 3235 pass / 7 skip / 2
fail in 47.5s — the 2 fails are exactly the documented DEC-068/DEC-070
pre-existing exceptions (`learning-cycle.test.mts`, `eval-generator.test.mts`),
nothing new. Crew test suite: 1701 pass / 117 skip / **0 fail** in 11.9s.

**Minor, non-blocking:** the workflow's own top-of-file comment (lines 16-17)
says "root's 18 + crew's 8 blocking + crew's 4 advisory" — the actual
`validators:`/`advisory-validators:` blocks contain 9 crew-blocking (gates
20-28 in docs/ci-gates.md) and 6 crew-advisory (gates 29-34), not 8/4. Cosmetic
only (docs/ci-gates.md's own numbered list, which is the documented source of
truth, is correct) but worth a one-line fix since this comment is meant to be
self-documenting.

## 2. learnings.jsonl fix — real, not vacuous

`bun ./src/scripts/validate-learnings-schema.mts --repo .` passes clean. The 4
corrected entries (lines 22/29/40/43, per docs/ci-gates.md's ledger) came from
the `validation_fail` capture path's pre-FEAT-220 shape and were fixed by
adding `key`+`insight` mirroring the existing `summary` — a correction derived
from the record's own data, not fabricated content. `crew/.claude/artifacts/
loop/learnings.jsonl` is correctly left untouched (documented as out of gate
16's scope, root-file-only).

## 3. CLAUDE.md — BLOCKING: the CI-gates handshake is broken

This is the exact failure mode the task asked to check hard, and it's real.

- Byte budget: `CLAUDE.md` is 12274 bytes, under the 12288 cap — matches the
  handoff's claim exactly.
- `<!-- clause: backlog-discipline -->` and `<!-- clause: repo-conventions -->`
  are present as HTML comments (lines 138, 122).
- `crew:start`/`crew:end` and `runner:start`/`runner:end` marker blocks are
  byte-identical to pre-slice (`git diff -U0` shows zero changed lines inside
  either block range).
- `bun src/scripts/validate-agent-refs.mts` passes clean — every `devcrew:*`
  token resolves.
- **But CLAUDE.md's `## CI gates` numbered list (lines 88-118) does not match
  `docs/ci-gates.md`.** It lists only 19 entries, and they are not even a
  truncated prefix of the real 41 — it's a structurally different, stale list
  (closer to `runner-plugin`'s pre-merge 18-gate list than to SLICE-24's
  actual merged workflow). It is missing `validate-event-schemas`,
  `validate-learnings-schema`, `validate-effort-points`, and — notably —
  `validate-branding-scrub`, the **new gate SLICE-24 itself added** in this
  same joint change. It is also missing all 22 of crew's gates: every
  `crew/scripts/validate-*.mts` invocation, `crew/tsconfig.json`'s tsc
  project, both crew biome invocations, and the entire crew test suite.
  SLICE-25's own handoff artifact claims "CLAUDE.md's CI gates numbered list
  matches docs/ci-gates.md's 19 gates exactly (SLICE-24 landed that file
  first)" — but `docs/ci-gates.md` has 41 numbered gates, not 19, so the claim
  is wrong on its face, and the actual CLAUDE.md content confirms the port
  never happened.
- This isn't cosmetic: `docs/ci-gates.md`'s own header states the two files
  "must stay in sync" because `generate-metrics-band.mts` counts CLAUDE.md's
  list programmatically for the README metrics band. That gate (`bun
  ./src/scripts/generate-metrics-band.mts --check`) currently passes only
  because it's internally self-consistent with the *wrong* number — it
  re-derives 19 from CLAUDE.md and finds README.md already committed to
  claiming 19. The published `README.md` metrics band (`| CI gates enforced |
  19 |`) is a false public claim; the real, verified count is 41.

**Fix required:** port `docs/ci-gates.md`'s numbered list (1-41, including
blocking/advisory annotations) verbatim into CLAUDE.md's `## CI gates`
section, matching the schema `generate-metrics-band.mts` parses (`^N. `
top-level items), then rerun `generate-metrics-band.mts --check` to
regenerate README's `19` to `41`. Given CLAUDE.md is already only 14 bytes
under its 12288 cap per SLICE-25's own handoff, a full 41-gate list will very
likely need summarization/trimming elsewhere in the file to fit — flag that
tradeoff back to the team rather than silently truncating the gate list again.

## 4. AGENTS.md / README / docs-map — honest

`AGENTS.md`, `README.md`, and `docs/README.md` all correctly describe
`crew/docs/**` (123 files) as an explicitly deferred, not-yet-migrated
disposition and `crew/` as a vendored rump pending FEAT-006 cutover — no
claims of already-done absorption. Matches SLICE-25's stated scope.

## 5. validate-all advisory change (lead-applied) — correct logic, BLOCKING format break

Read `crew/scripts/validate-all.mts` and `crew/tests/validate-all.test.mts`
diffs directly. The advisory-tier split is correct and consistent with
SLICE-24's ratified decision (docs/ci-gates.md gates 33/34): `validate-agents`/
`validate-skills` moved out of the blocking `validators` array into a separate
`advisoryValidators` array; blocking failures still set `process.exitCode`/
`process.exit(1)` via the original `failures.length > 0` check (unaffected by
the advisory array), advisory results print `✓`/`⚠` but never touch exit code.
Updated test assertions ("All 2 validators passed", loosened match on
skills/agents without the `✓` prefix) correctly reflect the new behavior and
pass (`bun test tests/validate-all.test.mts`: 2 pass, 0 fail). This also
resolves the "known-red side effect" `docs/ci-gates.md` currently documents
for `crew/tests/validate-all.test.mts` — confirmed via the full crew suite run
(0 fail, see §1) — but that doc section (lines 260-270) still describes it as
presently failing. Minor, non-blocking: update or remove that stale paragraph
in the same change that lands this fix, so the doc doesn't claim a live defect
that's actually already resolved.

**Blocking:** `cd crew && bunx biome format scripts/ tests/` (CI gate 39)
currently **fails**, exit 1, on exactly the two files this diff touches:
`crew/scripts/validate-all.mts` (the two new array literals should collapse to
one line per biome's style — not just the `\n`-per-item form left in the diff)
and `crew/tests/validate-all.test.mts` (CRLF line endings biome wants
normalized to LF). Confirmed not an environmental/pre-existing issue —
`biome format` scanned 357 files in `crew/scripts`+`crew/tests` and found
exactly these 2 errors, both inside this diff's own changed lines. This gate
is part of the required `fast-gate` check; as committed, this change would
fail CI on push. Fix: `cd crew && bunx biome format --write scripts/
validate-all.mts tests/validate-all.test.mts` (or format the whole `crew/`
tree, matching SLICE-24's precedent of a mechanical whitespace-only sweep)
before landing.

## 6. Full gate — evidence

Ran locally rather than a single CI dry-run (self-hosted-only reusable
workflow, `astragenie/common/...@v1`, isn't invokable from this environment):
install (root + crew) ~4s; all 18 root + 9 crew blocking validators ~4s total;
3 tsc projects + 4 biome invocations ~3s (one failure, §5); root test suite
47.5s (2 pre-existing known-fails); crew test suite 11.9s (0 fail). Everything
green except the two items above.

## Decision: changes_requested

Two blocking items, both mechanically small but both real and both would fail
CI or ship a false public claim as committed:

1. CLAUDE.md's `## CI gates` list must actually be the 41-gate
   `docs/ci-gates.md` list (currently a stale, unrelated 19-gate list) — also
   requires re-running `generate-metrics-band.mts` to fix README's `19` →
   `41` claim.
2. `crew/scripts/validate-all.mts` + `crew/tests/validate-all.test.mts` need a
   `biome format --write` pass — gate 39 is currently red on this diff.

Non-blocking cleanup suggested in the same pass: fix `ci.yml`'s own
"8 blocking + 4 advisory" header-comment miscount (actual 9/6), and
update/remove `docs/ci-gates.md`'s now-stale "known-red" paragraph about
`validate-all.test.mts` since the advisory-tier fix already resolves it.
