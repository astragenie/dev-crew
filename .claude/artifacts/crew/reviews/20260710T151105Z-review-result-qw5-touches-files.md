---
decision: approved
reviewer: crew-reviewer (independent, no builder self-report available)
commit: 18eac4bf712281e66765adcce11217720d616c7b
branch: fix/qw5
worktree: C:/work/mega/runner-plugin-worktrees/qw5
files_reviewed:
  - src/scripts/validate-slice-touches-files.mts
  - .github/workflows/ci.yml
  - CLAUDE.md
  - src/tests/wave/validate-touches-files.test.mts
---

# Review: validate-slice-touches-files planned-path handling + CI wiring

## Verdict: PASS (approved), with one non-blocking follow-up

Builder went idle without a self-report; this review re-derived and
independently ran all evidence below rather than trusting any prior claim.

## Evidence (all commands run fresh in the worktree)

- `bun test src/tests/wave/validate-touches-files.test.mts` → 5 pass, 0 fail.
- `bun test src/tests/ --parallel --timeout 60000` (full suite) → 2660 pass,
  1 skip, 0 fail, across 279 files.
- `bunx tsc --project tsconfig.json --noEmit` → clean, no output.
- `bunx tsc --project tsconfig.test.json --noEmit` → clean, no output.
- `bunx biome lint` / `bunx biome format` on both touched files → "Checked 2
  files... No fixes applied" (clean) for both.
- `bun ./src/scripts/validate-slice-touches-files.mts` on the real tree →
  `Scanned 14 slice files; 1 warnings, 0 errors` (warning is SLICE-139
  missing `touches_files`, unrelated to this change, pre-existing).

## 1. Planned-path heuristic — what it accepts, and a real gap

New `checkPath()` (`src/scripts/validate-slice-touches-files.mts:44-52`):
absolute / `..` / glob (`*`) checks are unchanged; the new behavior is: if
the immediate parent dir doesn't exist, fall back to checking only the
**top-level path segment** (`topLevelSegment()`, line 33-36) against the
repo tree, and accept if that alone exists.

Confirmed against the real case cited in the brief: `SLICE_122` has no
`touches_files` frontmatter field at all, but its body prose contains
`docs/architecture/operating-loop.md`, which `readTouchesFiles`'s
`INFERENCE_RE` regex (`src/scripts/lib/wave/touches-files.mts:5-6`) matches
and reports with `confidence: "inferred"`. `docs/architecture/` does not
exist in this repo (`docs/` does). Under the old logic (strict
`dirname(p)` check) this hard-errored; under the new logic it top-level-
matches on `docs/` and passes cleanly — verified by direct
`validateRepo()` run, 0 errors. This is a legitimate false-positive fix,
not a workaround: an inferred/planned new subdirectory under an existing
top-level area is not a typo.

**Gap found (not blocking, but worth a follow-up):** the fallback checks
only the very first path segment, with no limit on how many intermediate
segments are missing. I probed this directly:

```
touches_files:
  - src/totally/made/up/nested/path/foo.mts
```
→ `{"errors":[],"warnings":[],"filesScanned":1}` — zero errors, even
though every single intermediate directory (`totally/`, `made/`, `up/`,
`nested/`, `path/`) is fabricated. The check only confirms `src/` (the
real top-level dir) exists; it never re-validates anything below it.

This is more permissive than the stated intent ("a slice legitimately
plans to create a new subdirectory") — it silently accepts an arbitrarily
deep, entirely invented subtree as long as the first segment matches a
real top-level dir name. For a validator whose whole purpose is catching
fabricated/typo'd `touches_files` entries before they corrupt wave
conflict-packing, this narrows the guard more than necessary. A tighter
fix that still passes the SLICE-122 case would check one level up from
the missing parent (`dirname(dirname(p))`) rather than the top-level
segment — `dirname(dirname("docs/architecture/operating-loop.md"))` is
`docs`, which exists, so the real-world fix case is preserved, but the
5-level-deep fabricated path above would still be caught (its
grandparent-of-leaf, `src/totally/made/up/nested`, does not exist).

Severity: **[LOW]** — does not block this change (it's strictly an
improvement over the prior all-or-nothing check, and the concrete bug in
the brief is fixed and tested), but the new test suite doesn't lock down
against multi-level fabrication, so the loophole has no regression test
either. Recommend a fast-follow slice tightening `checkPath` to check
one level above the missing parent instead of the top-level segment, plus
a test asserting a deep fabricated path under a real top-level dir still
errors.

## 2. Scanned-count drop (18 → 14) — not caused by this diff

`listSlices()` / `STATES = ["pending", "in-progress", "needs-review"]`
(`src/scripts/validate-slice-touches-files.mts:13`) is **unchanged** by
this diff — confirmed via the diff hunk, which only touches
`extractCreated`, adds `topLevelSegment`/`checkPath`, and replaces the
inline per-path error logic in the loop body with a call to `checkPath`.
No change to which directories are scanned.

Independently confirmed the repo currently has 14 files under
`.claude/artifacts/loop/ai-loop/slices/pending/`, zero under
`in-progress/` or `needs-review/` (both directories don't exist), and the
live validator run reports "Scanned 14 slice files" — consistent with
disk state, not a scope narrowing introduced here. The 18→14 change is
backlog churn between whenever the "18" baseline was captured and now
(slices moved to `completed/` or elsewhere), not a coverage regression in
this PR. `completed/` currently holds 152 files and was never in-scope
for this validator before or after this change — it is intentionally
excluded (only actionable/open slices are checked; a completed slice's
touches_files can no longer break a live wave-pack).

## 3. `.github/workflows/ci.yml` wiring

New line `bun ./src/scripts/validate-slice-touches-files.mts` sits in the
`fast-gate` job's `validators:` block, indentation matching every sibling
line exactly (8-space block indent under `validators: |`), positioned
between `validate-backlog-writes.mts` and `validate-snapshot-freshness.mts`.
Same job, same `bun ./src/scripts/...` invocation style as every other
validator in that block. No ordering dependency exists between these
validators (each is a standalone read pass), so placement is fine.
`fast-gate` is gated by `needs.changes.outputs.code == 'true'`
(docs-only PRs skip it), consistent with how every other validator in
this list already behaves — no special-casing needed for this one.
No YAML syntax risk: diff is a pure single-line insertion, no reflow of
surrounding lines.

## 4. `CLAUDE.md` CI-gates list

Full section reviewed (`CLAUDE.md` "CI gates" H2, `<!-- clause: ci-gates
-->`) — confirmed via `sed -n '60,105p'`. The `+13/-2` diff is entirely
one renumbering: old item 11 (`bun test ...`) becomes 12, old item 12
(`validate-snapshot-freshness`) becomes 13, and the new item 11 describes
`validate-slice-touches-files.mts`. Numbering 1-13 is sequential with no
gaps or duplicates. No other CLAUDE.md section was touched — the diff
(`git diff origin/main...HEAD -- CLAUDE.md`) is a single contiguous hunk
inside the CI-gates list; nothing before or after it changed.

Description accuracy checked line-by-line against the actual code:
"validates every pending/in-progress/needs-review slice's `touches_files`
(declared or inferred from body prose)" — matches `STATES` constant and
`readTouchesFiles` confidence branches. "Errors on absolute paths, `..`
traversal, or a path whose top-level segment doesn't exist anywhere in
the repo" — matches `checkPath`. "A missing immediate parent dir under a
real top-level area is allowed" — matches, though per finding #1 above
the doc slightly undersells how permissive the fallback actually is (it
reads as "one level of planned nesting," but the code allows unlimited
depth). Not a blocking doc bug, but worth tightening the wording in the
same fast-follow as #1. "Warns (does not fail) when `touches_files` is
absent... on/after `--warn-cutoff` (default 2026-06-15)" — matches
`main()`'s default and the warning branch in `validateRepo`.

## 5. Was SLICE_122 itself edited?

No. `git diff origin/main...HEAD --stat -- .claude/` is empty — zero
slice/backlog files changed in this commit. Only the validator changed.
This is the correct choice: SLICE_122's inferred path
(`docs/architecture/operating-loop.md`) is a legitimate reference to
planned future work (an AgentOps promotion-ratchet doc this slice will
author), not a mistake to be edited away, and touching backlog content
to route around a validator bug would have been the wrong fix.

## 6. Test diff

`src/tests/wave/validate-touches-files.test.mts` diff is purely additive
— one new `test(...)` block (lines +76 to +93 relative to
`origin/main`), no existing test bodies, assertions, or fixture setup
lines modified. Confirmed via the full diff hunk (single `@@ -76,6
+76,24 @@` block, all `+` lines).

## Summary

The core fix is real, evidence-backed, narrowly scoped, and does not
touch backlog/slice content to route around itself. CI wiring and doc
updates are both correct and consistent with sibling conventions. One
LOW-severity heuristic gap (unlimited fallback depth vs. intended
"one new planned segment") is not blocking — it's a strict improvement
over the prior state and the concrete reported bug is fixed and tested —
but should be tightened in a fast-follow slice with a regression test for
multi-level fabricated paths.
