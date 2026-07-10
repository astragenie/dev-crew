---
slice: QW4
title: "QW4 — per-slice ACs from proposed_slices; warn on shared FEAT-AC copies"
decision: approved
reviewer: crew:reviewer (independent review agent)
commit: 9217475f (fix), 58e867c8 (original)
worktree: C:/work/mega/runner-plugin-worktrees/qw4
branch: fix/qw4
date: 2026-07-10
---

## Re-review (2026-07-10, commit 9217475f): APPROVED

The CRITICAL frontmatter round-trip bug below is fixed. I independently
re-ran both of my original repros against the fixed parser (not just the
builder's own tests) plus adversarial cases the fix's quote-aware split
could plausibly still miss, all through the real code paths:

1. **Original inline-comma repro** — `updateFeatureFrontmatter` →
   `sliceFromFeature` with `acceptance_criteria: ["Given a logged-in user,
   when they click save, then the record persists"]` now round-trips to
   exactly one verbatim checkbox bullet. Confirmed via the builder's new
   `src/tests/slice-from-feature-proposed-slices.test.mts` test and my own
   standalone script hitting `serializeFrontmatter`/`parseFrontmatter`
   directly.
2. **Original nested block-list repro** — now throws the new
   `FrontmatterNestingError` (`"proposed_slices" item field
   "acceptance_criteria" is written as a nested block list... rewrite it as
   an inline array`) instead of the old misattributed `parseProposedSlices`
   "got null" crash. Reproduced directly against `parseFrontmatter`.
3. **Quote-aware split edge cases** — tested two adversarial inputs the
   builder's own tests don't cover: an apostrophe inside a double-quoted
   segment (`acceptance_criteria: ["it's, tricky"]`) and a raw embedded
   double-quote inside a single-quoted segment
   (`acceptance_criteria: ['a "b, c" d']`, hand-authored, since
   `serializeScalar` itself never emits single-quoted output). Both parse
   correctly — `it's, tricky` and `a "b, c" d` respectively — no
   regression vs. pre-QW4 behavior for either quoting style.
4. **Peek-ahead safety** — verified the two boundary cases myself:
   `acceptance_criteria:` (empty) immediately followed by the outer array's
   next sibling item at the *same* indent still parses to `null` (no
   throw, matches prior behavior); and `acceptance_criteria:` as the
   literal last content line before the closing `---` fence (no following
   line at all) also parses to `null` without crashing —
   `detectEmptyValueShape`'s fallback ("scalar" when no further non-empty
   line is found) and the `if (nextLine && ...)` guard both hold.
5. **Corpus-scan claim** — independently reproduced, not just spot-checked:
   wrote a standalone script loading the pre-fix `frontmatter.mts` (via
   `git show 58e867c8:...`) alongside the fixed version, ran both over
   every `.md` file in the repo containing a `---` fence (2,172 files,
   matching the builder's count) and byte-compared
   `JSON.stringify(parseFrontmatter(content).frontmatter)` — **0
   divergences, 0 new throws**. Also isolated the 21 files under
   `.claude/artifacts/crew/bundles/orphan/` (the flow-mapping trap files
   from the earlier plugin-std evaluation) specifically per the ask — same
   result, 0 divergences.
6. **Existing-assertion-unmodified gate, re-checked for this commit too** —
   `git diff 58e867c8 9217475f -- src/tests/ --ignore-all-space` shows only
   Biome line-wrap reformatting of unchanged assertion text (verified
   byte-for-byte after whitespace normalization) plus one new test; no
   existing assertion's meaning changed.
7. **Evidence re-run:** `bun test src/tests/ --parallel --timeout 60000` →
   2675 pass / 1 skip / 0 fail across 279 files (up from 2670, +5 new
   tests — matches claim). `bunx tsc --project tsconfig.json --noEmit` and
   `--project tsconfig.test.json --noEmit` both clean.
   `bunx biome lint` on the touched files clean.

Nothing outstanding. The fix closes the gap cleanly, fails loudly (named
error, not a misattributed crash) on the one shape it still can't support,
and the new tests target the exact failure modes from the original review
rather than restating the happy path. Approved.

## Original review (2026-07-10, commit 58e867c8): REJECTED

One CRITICAL data-corruption bug, reproduced end-to-end through the real product
code path (`updateFeatureFrontmatter` → `sliceFromFeature`), not just traced by
inspection. Every other gate checked out clean.

## Findings

**[CRITICAL] `src/scripts/lib/frontmatter.mts` (unmodified by this diff, but newly
exercised) — the hand-rolled frontmatter parser cannot round-trip an
`acceptance_criteria` array nested inside a `proposed_slices` array-of-mappings
item. Both natural authoring shapes for this new field are broken; one throws,
the other silently corrupts data.**

`proposed_slices` items were scalar-only before this change (`id_suffix`,
`title`, `points`). `acceptance_criteria?: string[]` is the first array-valued
field ever nested inside an array-of-mappings item, which is exactly the shape
`frontmatter.mts`'s own header comment documents as rejected: "Rejects
multi-level nesting beyond that (mappings inside mappings inside arrays etc.)."
Neither `proposed-slices.mts` nor the new tests account for this.

Reproduced via the actual product path — write a FEAT with `updateFeatureFrontmatter`
(the real `mergeFrontmatter`/`serializeFrontmatter`), then materialize with
`sliceFromFeature` (the real `parseFrontmatter`/`parseProposedSlices`):

```
proposed_slices: [
  { id_suffix: "-SLICE-1", title: "First", points: 5,
    acceptance_criteria: ["Given a logged-in user, when they click save, then the record persists"] },
  { id_suffix: "-SLICE-2", title: "Second", points: 3 }
]
```

On-disk frontmatter after `serializeFrontmatter` (inline-array form — the only
form `emitArrayOfMappings`/`serializeScalar` can produce for an array-valued
item field):

```
acceptance_criteria: ["Given a logged-in user, when they click save, then the record persists"]
```

Materialized slice's AC section after `sliceFromFeature` re-parses that file
(the bug is in `parseScalar`'s inline-array branch, which does
`inner.split(",")` with no quote-awareness):

```
- [ ] "Given a logged-in user
- [ ] when they click save
- [ ] then the record persists"
```

One GWT-style AC silently becomes three garbled, quote-mangled bullets — no
error, no warning. This ships straight past `ac-linter.mts`'s placeholder
check (none of the 4 patterns match) and `detectAcceptanceCriteria`'s bullet
counter (still 3 non-empty `- [ ]` lines), so nothing downstream flags it.

The other natural authoring shape — a nested YAML block list, which is how
this repo's own conventions write every other array field (including
`proposed_slices` itself) — fails differently and harder:

```
proposed_slices:
  - id_suffix: -SLICE-1
    title: First
    points: 5
    acceptance_criteria:
      - Given a logged-in user, when they click save, then the record persists
      - A second criterion
```

`extendLastArrayMapping` matches the empty-valued `acceptance_criteria:` line
via `NESTED_KV_RE` and unconditionally sets `last.acceptance_criteria =
parseScalar("") = null` (it doesn't peek ahead for array shape the way the
top-level `applyEmptyValue`/`detectEmptyValueShape` path does). The following
`- Given a logged-in user...` lines are then misread as new *top-level*
`proposed_slices` array items (state.currentArrayKey is still
`"proposed_slices"`), injecting bare strings into what should be an array of
objects. `parseProposedSlices` throws `InvalidProposedSlicesError:
acceptance_criteria in slice 0 must be a non-empty array of non-empty strings
(got null)` — a hard crash, and the message misattributes the fault to the
author's data rather than the parser, which would send a debugger down the
wrong path entirely.

Given this repo's own PM inline-AC contract (FEAT-277, `agents/pm.md` §
"Inline AC + SPEC drafting") produces Given-When-Then prose — which is
comma-heavy by construction — this is not an edge case; it is close to the
median case for real content the PM agent would put in this exact field.

**Why the added tests missed it:** every new test that exercises
`acceptance_criteria` end-to-end (`src/tests/slice-from-feature-proposed-slices.test.mts`)
uses AC text with no commas (e.g. `"AC-1: first slice's own scoped criterion"`),
and the unit tests in `src/tests/proposed-slices.test.mts` construct the `raw`
array as an in-memory JS object and call `parseProposedSlices` directly,
never touching `serializeFrontmatter`/`parseFrontmatter` at all. No test in
this diff writes a FEAT file to disk with a comma-bearing
`acceptance_criteria` entry and reads it back.

**Fix direction (not prescriptive):** either (a) make
`parseScalar`'s inline-array branch quote-aware (a small, local, testable fix
— split respecting quoted segments, matching what `emitArrayOfMappings`
already produces), or (b) give `acceptance_criteria` its own escape hatch —
e.g. serialize it as a single JSON-encoded scalar string on one line instead
of routing it through the array-of-mappings inline-array path — and add a
round-trip test with commas as a permanent regression guard either way.

## Gates checked (all pass)

1. **Existing test assertions unmodified** — `git diff origin/main...HEAD --
   src/tests/ | grep -E '^-' | grep -v '^---'` returns nothing; the three
   touched test files (`proposed-slices.test.mts`,
   `backlog-store-slices.test.mts`, `slice-from-feature-proposed-slices.test.mts`)
   contain only added hunks.
2. **AC-warning banner placement** — `> WARNING: ...` starts with `>`, which
   none of `extractAcceptanceCriteria`'s `classifyAcceptanceCriteriaLine`,
   `ac-linter.mts`'s `AC_BULLET_RE` (`/^\s*-\s+\[[x\s]\]/`), or
   `acceptance-criteria.mts`'s `AC_BULLET_RE` (`/^- (\[[ x]\] )?\S/`) match —
   confirmed it is never counted as an AC bullet or corrupts
   `extractAcceptanceCriteria` for downstream re-materialization.
3. **Replace-not-merge semantics** — verified by
   `backlog-store-slices.test.mts` ("must NOT appear") and
   `slice-from-feature-proposed-slices.test.mts` ("own acceptance_criteria
   must replace, not merge") assertions; both pass.
4. **Schema validation** — `validateOne`'s `acceptance_criteria` branch
   correctly rejects non-array, empty-array, and blank-string-entry values
   with a clear `InvalidProposedSlicesError`, and is a no-op (field omitted)
   when absent, so existing FEATs without the field are unaffected.
5. **`materializeSingleSlice` / single-entry `proposed_slices`** — confirmed
   unchanged; no reference to `acceptanceCriteria`/`acWarning` in that path.
6. **Evidence reproduced independently:**
   - `bun test src/tests/proposed-slices.test.mts
     src/tests/backlog-store-slices.test.mts
     src/tests/slice-from-feature-proposed-slices.test.mts --timeout 60000`
     → 44 pass / 0 fail.
   - `bun test src/tests/ --parallel --timeout 60000` → 2670 pass / 1 skip /
     0 fail across 279 files (matches the claimed evidence).
   - `bunx tsc --project tsconfig.json --noEmit` → clean.
   - `bunx tsc --project tsconfig.test.json --noEmit` → clean.

## Recommendation

Reject as-is. The feature's core mechanism (per-slice AC replace/merge logic,
warning banner, schema validation, backward compatibility) is sound and well
tested for the paths it does cover. But the one path this diff exists to
enable — a PM handing a proposed slice its own free-text acceptance
criteria — is demonstrably broken by the frontmatter layer for realistic
GWT-style content, and no test catches it because every test happens to
avoid commas. This needs a frontmatter-round-trip fix (or an explicit
different serialization strategy for this field) plus a regression test
with comma-bearing AC text before merge.
