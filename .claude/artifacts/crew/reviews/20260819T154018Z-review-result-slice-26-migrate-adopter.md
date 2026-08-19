---
decision: needs_fix
reviewer: crew:reviewer
slice: SLICE-26
reviewed_commits: [223961b7, 474be650]
---

# Review — SLICE-26 migrate-adopter.mts + bulk adopter migration

## Summary

Core mechanism (marker-block regen, token rewrite, config migration, diff)
is solid and the ledger's AC-2 idempotence-bug narrative is accurate and
verified by round-trip. However, round-tripping the real migrated adopters
surfaced a defect the ledger did not report: **7 of the 16 applied adopters
now carry a duplicate, partially-corrupted legacy "Autonomous Loop HARD
RULES" block** because the script only recognizes `crew:`/`runner:`/`devcrew:`
marker literals and has no knowledge of a third legacy marker pair,
`<!-- loop:start -->...<!-- loop:end -->`, that a separate "Wiggin Loop"
installer used in these adopters' history. This is a real, currently-live,
committed (if unpushed) data-integrity bug — not a false alarm — so the
slice needs a fix before this can close.

## Findings

### 1. [HIGH] Unrecognized `loop:start`/`loop:end` marker pair left half-mutated in 7/16 adopters

`replaceMarkerBlocks` (`src/scripts/lib/migrate-adopter-markers.mts`) only
knows about `ALL_MARKER_PAIRS` = `crew:`/`runner:`/`devcrew:`. It does not
know about `<!-- loop:start -->...<!-- loop:end -->`, a distinct marker
pair used by a separate, older "Wiggin Loop" installer
(`/loop:install`) that several real adopters still carry. Confirmed present
(2 marker-literal matches: one start, one end) in exactly the 7 adopters the
ledger already flagged as needing the AC-2 trailing-newline corrective pass
— `authentic`, `common`, `marketing`, `memory`, `raskraska`, `runner`,
`sales`:

```
authentic:  loop:start/end matches = 2
common:     loop:start/end matches = 2
marketing:  loop:start/end matches = 2
memory:     loop:start/end matches = 2
raskraska:  loop:start/end matches = 2
runner:     loop:start/end matches = 2
sales:      loop:start/end matches = 2
```
(the other 9 applied adopters + demo-repo show 0 matches)

What actually happened in each of these 7 repos (verified on `authentic` and
`memory` by reading the file and the migration commit diff):
- `replaceMarkerBlocks` correctly found and replaced the adopter's
  `crew:start/end` span with the freshly-rendered `devcrew:start/end` block.
- It left the separate, untouched `<!-- loop:start -->...<!-- loop:end -->`
  span completely alone (unrecognized marker literal, not in scope).
- `rewriteDispatchTokens` then runs over the **whole file**, not scoped to
  outside-marker-block regions the way the code comment in
  `migrate-adopter-tokens.mts` assumes ("a marker-block-free file, or a file
  with no marker blocks to begin with"). Since the script doesn't recognize
  `loop:start/end` as a marker span, it treated that region as ordinary
  prose and rewrote the `/crew:build`, `/crew:fix`, `crew fleet` etc. tokens
  *inside* it to `/devcrew:build`, `/devcrew:fix`, etc.

Net result on disk today, e.g. `C:\work\mega\authentic\CLAUDE.md` (lines
26–65) and `C:\work\mega\memory\CLAUDE.md` (lines 7–275): **two large,
overlapping "## Autonomous Loop — HARD RULES" sections coexist** — one
correctly rendered under `<!-- devcrew:start/end -->`, and one stale
duplicate still wrapped in the old `<!-- loop:start/end -->` markers, whose
internal dispatch tokens are now a broken mix ("This repo runs the Wiggin
Loop autonomously" next to `/devcrew:build`/`/devcrew:fix`, `/loop:slice
start`, `/loop:phase-gate` — none of which is a real command in the unified
devcrew namespace).

This directly contradicts the ledger's own claims:
- AC-1: "dry-run diff touched only CLAUDE.md marker block + dispatch tokens
  **outside those blocks** ... zero unexpected file touches" — the token
  rewrite reached *inside* an (unrecognized) marker block region.
- AC-4 marker-shape check: "Every applied adopter's CLAUDE.md ended with
  exactly one `<!-- devcrew:start -->...<!-- devcrew:end -->` block" is true
  only for the literal devcrew markers; it elides that the same file also
  still carries a full, stale second copy of the same content under a
  different, unrecognized legacy marker name — exactly the class of mess
  this migration exists to clean up.

Affected repos (all already committed locally, per the ledger, unpushed):
`authentic`, `common`, `marketing`, `memory`, `raskraska`, `runner`,
`sales` — 7 of 16 applied adopters (44%).

**Fix needed**: add `loop:start`/`loop:end` to the recognized legacy marker
pairs in `migrate-adopter-markers.mts` (fold it into the same collapse as
crew:/runner:), and re-run the migration (or a targeted repair pass) against
these 7 adopters to remove the duplicate block and repair the accidentally
half-rewritten tokens inside it. Given `enumerateAdopters`'s
`hasLegacyMarkerBlock` currently only greps for `runner:start`/`crew:start`,
it's also worth auditing whether any of the 2 skipped repos (`kb`,
`standards`) or any repo outside the enumerated `C:/work/mega` /`C:/work`
roots carry a `loop:start` block with no `crew:`/`runner:` block alongside
it — such a repo would silently not be enumerated as a migration candidate
at all.

### 2. [LOW] Ledger test-count claim does not match reality

Ledger states `bun test src/tests/migrate-adopter.test.mts` → "pass, 24/24".
Actual: `grep -c '^test(' src/tests/migrate-adopter.test.mts` = 21, and a
live run confirms **21 pass, 0 fail** (not 24). Not a functional defect —
just a self-reported-evidence inaccuracy worth correcting in the ledger.
`dispatcher-config.test.mts` claim (pass) is accurate: 3 pass, 0 fail,
verified live.

### 3. Verified as accurate / no issues found

- **AC-2 fix (474be650) is a real, correctly-targeted fix.** Root cause
  (`trimStart()` vs `trim()` on trailing content in `replaceMarkerBlocks`,
  `src/scripts/lib/migrate-adopter-markers.mts:127`) is real: with the old
  `trimStart()`-only code, trailing content ending in a newline keeps that
  newline, and the function's own `${parts.join("\n\n")}\n` template adds
  one more on top each call — growing trailing blank lines by one per
  invocation whenever content follows the marker block. Traced through by
  hand: the new regression test (`replaceMarkerBlocks: repeated calls with
  trailing content after the block do not grow trailing blank lines`) would
  fail under the old `trimStart()` code (second/third calls would produce
  growing output, breaking the `once === twice === thrice` equality
  assertion) and passes under `trim()`. Confirmed genuine, not a rubber-stamp
  test.
- **AC-2 round-tripped independently** on 2 real migrated adopters
  (`authentic`, `dating`, both from the 7-affected and non-affected groups
  respectively): `bun src/scripts/migrate-adopter.mts --repo <path>
  --dry-run` on each reports `CLAUDE.md: no change` and
  `config: {"action":"already-migrated", ...}` — confirmed zero-diff on a
  fresh independent run, not just trusting the ledger's own re-run claim.
- **Token rewrite conservatism holds outside the loop:-marker case above.**
  `dating`'s CLAUDE.md (fully migrated, no `loop:` marker) shows exactly one
  clean `devcrew:start/end` block with fully-consistent `/devcrew:*`
  tokens throughout, no stray `runner:`/`crew:` text. The regex boundaries
  (slash-prefixed, backtick-wrapped, `subagent_type:` literal) correctly
  leave prose, repo names (`runner-plugin`, `dev-team`), and URLs untouched
  per the dedicated unit tests, which are legitimate (not tautological)
  assertions.
- **`kb` skip verified genuine.** `git status --short` in `C:\work\mega\kb`
  is clean (CLAUDE.md untouched), and `.claude/` contains no `loop.json` or
  `devcrew.json` — confirms `resolveConfig` genuinely has nothing to render
  from and the script's refusal-to-guess behavior is correct, not a
  swallowed error.
- **Config migration verified on `authentic`:** `.claude/devcrew.json` has
  `"schemaVersion": 2`; `.claude/loop.json.bak` is byte-identical to the
  live `.claude/loop.json` (`diff` reports no differences) — original config
  genuinely preserved, not silently dropped or mutated.
- **`resolveConfig` boundary compliance:** `migrate-adopter.mts` is the sole
  direct caller of `resolveConfig`; `migrate-adopter-markers.mts` takes
  `config` as a parameter and documents why, matching the pattern
  `dispatcher-config.test.mts` enforces. `dispatcher-config.test.mts` passes
  (3/3) confirming no boundary violation was introduced.
- **`lineDiff` (`migrate-adopter-diff.mts`)** is a straightforward LCS diff;
  read in full, no correctness concerns for the file sizes in play.
- **No marketplace write path** (AC-3): confirmed by reading the full
  `migrate-adopter.mts` — no reference to `astra-marketplace`, no
  `marketplace.json` write, no network call. AC-3's operator-confirmation
  requirement is correctly out of scope for this script by design, per the
  ledger's note; the actual marketplace swap was executed separately and is
  outside this review's evidence set.
- **Windows CRLF / block-at-EOF / multiple-blocks edge cases**: covered by
  existing fixture tests (`both crew and runner blocks collapse into one`,
  `already-devcrew content is a structural no-op`) — adequate for the
  patterns actually observed in real adopters (no repo required a
  multi-block-scattered or truly CRLF-divergent fixture that these tests
  don't already cover; the diff and marker logic operate on `\n`-split lines
  uniformly regardless of on-disk line-ending convention since Node's
  `fs.readFile(..., "utf8")` does not normalize CRLF, and no adopter file
  inspected showed CRLF).

## Decision rationale

`needs_fix`. The core migration logic is well-built and the ledger's
headline claim (AC-2 idempotence bug found and fixed) is accurate and
independently verified. But the round-trip against real adopters surfaced a
genuine, currently-uncaught defect affecting 7 of 16 applied repos: a
third legacy marker namespace (`loop:start/loop:end`) that the script
doesn't recognize, left half-mutated with broken/inconsistent dispatch
tokens duplicating the newly-rendered devcrew block. This is exactly the
kind of state corruption this migration is meant to prevent, it's already
committed (if unpushed) in 7 real repos, and it was not caught by the
ledger's own self-verify gates (which are unit/integration-test-based, and
none of the fixtures include a `loop:` marker pair). Needs a fix to
`migrate-adopter-markers.mts`'s marker-pair recognition plus a repair pass
against the 7 affected adopters before this slice can be considered done.
