---
slice: SLICE-203
feature: FEAT-288
reviewer: crew:reviewer (independent, dispatched by team lead)
commit: 1b3eab6e
decision: approved_with_notes
---

# Review: SLICE-203 — teach readTouchesFiles to parse inline-array YAML

## Verdict

**approved_with_notes.** The parser fix is correct and narrowly scoped: the
inline-array recognizer requires both a leading `[` and trailing `]` on the
trimmed value, so it cannot misfire on scalar prose. The pre-existing 6
block-style tests are byte-unchanged by the diff (confirmed via `git show`,
not just re-run), and the round-trip test (AC-3) genuinely exercises the real
`createSlice` → `serializeFrontmatter` → `readTouchesFiles` path with zero
stubbing. Two low-severity, untested edge cases exist in the quote-handling
helpers (findings 1-2) — neither reachable by real touches_files content
today, so notes rather than blockers. One factual correction to the task
brief (finding 3).

## Task-scoped finding 1 — false-positive coercion: correctly guarded, verified live

Read the code and additionally ran the real (unexported, so tested indirectly
via `readTouchesFiles`) parser against cases not in the test file:

- `touches_files: [Draft] retitle the issue` → trimmed value doesn't end in
  `]`, so `parseInlineArray` returns `null`; resolves to the plain string;
  `Array.isArray` is false → falls through to `missing` (confirmed via a
  throwaway probe script, not just reading). No coercion.
- `touches_files: [src/unterminated.mts` (no closing bracket) → same path,
  covered by the shipped "malformed inline-looking value" test → `missing`.
- `touches_files: []` → `inner === ""` short-circuits to `[]` before the
  splitter runs, so it never becomes `[""]` — covered by the shipped test,
  confirmed correct.

All three guard behaviors hold exactly as documented in the code comments.

## Task-scoped finding 2 — quote handling: symmetric case correct, asymmetric case silently passes through a stray quote (untested, low severity)

`stripQuotes` only strips when the trimmed value both starts *and* ends with
the *same* quote character. Ran the asymmetric cases directly against
`readTouchesFiles`:

```
touches_files: ["abc']   -> paths: ["\"abc'"]     confidence: declared
touches_files: ['abc"]   -> paths: ["'abc\""]     confidence: declared
touches_files: ["abc]    -> paths: ["\"abc"]      confidence: declared
```

None of these crash or get miscategorized as the wrong confidence tier — but
none get their leading quote character stripped either, so a hand-authored
frontmatter with a mismatched or unterminated quote silently reports
`confidence: "declared"` with a path string that still has a stray `"` or `'`
character embedded at the front. This is safe (no exception, no wrong-shape
coercion) but not covered by any test, and nothing downstream would catch a
garbage path like `"abc` being fed into wave planning as a "declared" file.
Not a blocker — writer-produced content (`createSlice`) never emits quoted
items at all, so this only bites a manually-edited slice file — but worth a
one-line doc-comment caveat or a follow-up test if this module is touched
again.

## Task-scoped finding 3 — comma splitting: NOT behaviorally identical to frontmatter.mts's copy for escaped-quote content (comment overstates the parity)

The doc comment says the local `splitInlineArrayItems` "mirrors
frontmatter.mts's splitInlineArrayItems." That's true for the plain
comma-inside-quotes case (verified: `["src/a, b.mts", 'src/c.mts']` splits
identically in both). It is **not** true once a double-quoted item contains a
backslash-escaped quote. `frontmatter.mts`'s version has an explicit
lookahead (lines 142-146 there) that treats `\"` inside a double-quoted
segment as a passthrough, not a close-quote; the local copy in
`touches-files.mts` has no such branch. Ran both through the same input:

```
touches_files: ["a\"b,c"]
```

- `frontmatter.mts`'s `parseFrontmatter` (via `parseScalar`) resolves this to
  one item, unescaped to `a"b,c`.
- `touches-files.mts`'s `readTouchesFiles` on the identical input returns
  `["\"a\\\"b", "c\""]` — i.e. it closes the quote early at the escaped `"`
  and then top-level-splits on the following comma, producing two garbled
  items instead of one. `stripQuotes` in this module also has no
  `unescapeDoubleQuoted` equivalent, so even without the comma it wouldn't
  unescape `\\`, `\n`, `\r`, `\"` the way the "real" parser does.

Practically low-risk: touches_files values are file paths, and nothing in
this codebase's writer path (`createSlice`) ever emits a backslash-escaped
quote inside one. But the builder deliberately chose to keep this as an
independent copy "so this hot-path reader stays a self-contained,
zero-dependency module" rather than importing — given that choice, the
comment claiming behavioral mirroring is inaccurate for this input class, and
if `frontmatter.mts`'s escape handling is ever extended, this copy will
silently drift further without anyone noticing (no shared test, no shared
implementation). Recommend either narrowing the comment's claim (it mirrors
the *quote-awareness and comma-splitting*, not escape-sequence semantics) or
filing a small follow-up to backport the escape-lookahead branch for
completeness. Not a blocker for this slice — the fixed bug (inline array not
recognized at all) is real and this defect predates it / is orthogonal.

## Task-scoped finding 4 — block-style path genuinely untouched (with one correction to the brief)

`git show 1b3eab6e` confirms the source diff is purely additive (4 new
helper functions inserted before `parseFrontmatter`, plus a one-line change
swapping `value.trim()` for `resolveInlineValue(value)` at the single call
site that previously always produced a plain string). No line inside the
existing block-list accumulation loop (`listAcc`/`currentKey` handling) was
touched.

One correction: the task brief said "the 5 pre-existing tests reportedly
pass unmodified." The actual pre-existing count is **6**, not 5: "declared
frontmatter wins," "inferred from In scope body," "missing when no
frontmatter," "dedup duplicate paths from body," "normalizes backslashes
from declared paths," and "non-existent slice file throws." The test-file
diff (`git show 1b3eab6e -- src/tests/wave/touches-files.test.mts`) shows
only new imports at the top and 4 new unit tests + 1 round-trip test
appended after line 111 — none of the original 6 tests' bodies changed.
Running the file standalone confirms **11 pass, 0 fail** (6 + 5 = 11),
consistent with byte-for-byte-unchanged originals plus 5 additions. The
underlying claim ("pre-existing tests pass unmodified") is correct; only the
count in the brief was off by one.

## Task-scoped finding 5 — AC-3 round-trip: exercises the real writer and real reader end to end, no stubbing on either side

Traced the call chain: `createSlice` (`backlog-store/slice-store.mts:397`)
→ `buildSliceMarkdown` → `serializeFrontmatter` (imported from
`frontmatter.mjs`, `slice-store.mts:16` — the real, non-copied serializer)
→ `fs.writeFile`. The test's `declaredTouches` paths
(`hooks/report-gate.mjs`, `.claude-plugin/hooks/hooks.json`) contain none of
`QUOTE_NEEDED_RE`'s trigger characters (`[:#[\]{}'",]`), so
`serializeScalar` emits them unquoted — `touches_files: [hooks/report-gate.mjs,
.claude-plugin/hooks/hooks.json]` — the exact shape used in the standalone
"writer's actual output shape" fixture test, and the exact shape the bug
report says is the live production output. `readTouchesFiles` is then called
directly on `created.filePath` with no mock, no intermediate transform. This
is a genuine, unstubbed round trip on both ends, and it is confirmed to be
the only test in the corpus doing so (no other test file in this repo wires
`createSlice` and `readTouchesFiles` together). Given the context that
0 on-disk slices/FEATs currently carry a real `touches_files` value, this
test is the sole guard against the writer/reader contract silently
re-diverging in the future — it earns its keep.

## Complexity claim: verified true, not taken on faith

Checked out `touches-files.mts` at the pre-fix commit (`71258829`) into a
scratch copy and ran `bunx biome lint` against it directly:
`noExcessiveCognitiveComplexity` on `parseFrontmatter` reports **18** (max
15) at both the pre-fix and post-fix revision — identical score, confirming
the builder's claim that this slice did not introduce or worsen the
violation. Pre-existing debt, correctly not addressed as in-scope rework.

## Gates

- `bun test src/tests/ --parallel --timeout 60000` → **3283 pass, 7 skip, 0
  fail** across 325 files (`capture-at-close-hook.test.mts` /
  `guard-feat-dispatch-hook.test.mts` did not fail this run — known-flaky
  under load per the task brief, not triggered here).
- `bunx tsc --project tsconfig.json --noEmit` and `--project
  tsconfig.test.json --noEmit` → both clean.
- `bunx biome lint src/` → exit 0; 61 warnings / 253 infos repo-wide (all
  pre-existing, this file contributes only the known `noExcessiveCognitiveComplexity`
  warning plus 3 unrelated `useOptionalChain`/`useLiteralKeys` suggestions,
  none new).
- `bunx biome format src/` → clean, no diffs.

## Recommendation

Approve as-is. Optional low-priority follow-ups (not blocking, not filed as
FEATs by this review — flag for the team lead to decide): (a) narrow the
`splitInlineArrayItems` doc comment's "mirrors frontmatter.mts" claim to
scope it to comma/quote-awareness rather than full escape-sequence parity
(finding 3), and (b) add one test for the asymmetric-quote pass-through
behavior in finding 2 so it's a documented decision rather than an
undiscovered corner.
