---
slice: SLICE-195
feature: FEAT-230
kind: review-result
status: completed
decision: approved
reviewer: independent (crew:reviewer)
date: 2026-08-04
---

# Review: SLICE-195 — live crew skill catalog enumerator

Commit reviewed: `25231df2` (`src/scripts/lib/skill-catalog.mts` + `src/tests/skill-catalog.test.mts`).

## 1. Enumeration correctness

Confirmed. `walkSkillDirs` (`skill-catalog.mts:88-111`) unconditionally recurses into
every subdirectory regardless of whether that directory itself was matched as a
skill (`await walkSkillDirs(full, domainRoot, out)` runs after the marker check,
not in an `else` branch) — this is the exact property that makes a directory
able to be both a skill and a parent of nested skills, which is what produced
the flat-listing error described in FEAT-230.md's "Corrected drift measurement"
section. It mirrors `validate-agent-refs.mts:200-218`'s `collectSkillDirNames`
marker-and-recurse shape line for line, differing only in that it also captures
`relPath`.

Ran the enumerator against the real `../dev-team` checkout
(`skill-catalog.mts` imported directly, `crewRepoPath` pointed at
`C:/work/mega/dev-team`): **36 skills**, matching both the FEAT-230.md claim
and an independent `find ../dev-team/skills/domain -name SKILL.md | wc -l` ->
36. Output also confirms three 2-level-deep nests the unit tests don't
exercise (`backend/dotnet/aspnetcore-patterns`, `csharp-conventions`,
`ef-core-patterns`) resolve correctly — a real-repo case beyond what the
fixture tests cover, and it passes.

## 2. Basename collision risk

Checked the real tree: `find ../dev-team/skills/domain -name SKILL.md | xargs -n1 basename -d | sort | uniq -c` — every one of the 36 basenames occurs exactly once today. No collision exists in the current catalog.

The code does not detect or guard against a future collision, though — `walkSkillDirs:105`'s `out.set(entry.name, ...)` silently overwrites on a repeat basename with no logged warning, and there's no test for it. Given the contract's own stated rationale (a catalog whose entire purpose is preventing silent skill-injection failures), a silent Map overwrite is the same failure shape in miniature. This is real but non-blocking for Decision-1 scope: the mapping table (SLICE-2) and CI fixture gate (SLICE-5) are the natural places to catch it, since a collision would only matter once two IDs are ambiguous to a *consumer*. Flagging as a note for SLICE-2/5, not a blocker for this slice — recommend either a comment acknowledging the known gap or (cheaper) logging when `out.has(entry.name)` is already true before overwrite, so a future crew reorg that collides doesn't fail perfectly silently even as a Decision-1-only concern.

## 3. Degrade paths

All four paths verified, each with a passing test in `skill-catalog.test.mts`:
- unset config (`{}`) -> null + reason matching `/crewRepoPath/` (test:58-65)
- config entirely absent (no second arg) -> same (test:67-74)
- configured but nonexistent path -> null + reason matching `/skills\/domain/` (test:76-86)
- exists but no `skills/domain` -> null + same reason pattern (test:88-98)

On the "one `isDirectory` check covers both" claim: `enumerateSkillCatalog`
(`skill-catalog.mts:120-137`) never separately stats `crewRepoPath` itself —
it computes `domainRoot = crewRepoPath/skills/domain` and calls
`isDirectory(domainRoot)` once, for both the nonexistent-root and
missing-subdir cases. This is legitimate, not masking: the reason string
always names the full `domainRoot` path (`configured crewRepoPath has no
skills/domain: <domainRoot>`), so a human reading the log can see exactly
which absolute path was probed and reason about it themselves — nothing is
lost by not distinguishing "root missing" from "root exists, subdir missing"
in the reason text, since the path itself carries that information. No
findings here.

## 4. DEC-068 precedent

`resolveCrewRepoPath` (`skill-catalog.mts:65-69`) is character-for-character
identical to `eval-generator.mts:65-69`'s `resolveCrewRepoPath` — same
signature, same `typeof configured !== "string" || configured.length === 0`
guard, same `path.isAbsolute(configured) ? configured : path.join(repoPath,
configured)` join. "Verbatim" is accurate, not an overclaim. Confirmed via
side-by-side diff of both functions.

## 5. No hardcoded allowlist

Confirmed — no static skill-name list anywhere in `skill-catalog.mts`. The
module is a pure filesystem walk; every ID it returns comes from a live
`fs.readdir`/`fs.access` call, not a table. Module header (`:13-17`) explicitly
documents rejecting `CREW_KNOWN_TOKENS`-style allowlisting and why. Consistent
with Decision 1's Option-C rejection in the landed contract.

## 6. Return shape as a forward contract

`Map<string, SkillCatalogEntry>` (`id`, `relPath`) is adequate for both named
consumers: SLICE-2 needs `id`-keyed O(1) existence checks against its mapping
table (exactly what a `Map` keyed by ID gives it), and SLICE-5's CI
fixture-refresh needs `relPath` for provenance in the committed snapshot file.
`relPath` is unused by any code today, but it's tested (`skill-catalog.test.
mts:50-51`) and its purpose is named in both the module header (`:43`) and the
architect contract (`skill-catalog.mts` proposed-shape section, "carried for
future logging/fixture provenance"). This is justified forward-looking, not
speculative — it costs one string field, is already covered by tests, and its
consumer is a slice in the same FEAT's already-decomposed plan, not a
hypothetical future user.

## 7. Wiring honesty

Confirmed zero production callers — `grep -r skill-catalog src/` matches only
the module itself and its test file. The module header (`skill-catalog.mts:27-
33`) discloses this prominently and accurately: names FEAT-281 by number,
states which slices (SLICE-2/3, this review's SLICE-196/197) are the intended
consumers, and explicitly distinguishes this from the tested-but-never-wired
defect pattern rather than leaving the reader to infer it. This is the
disclosed-foundation-slice case the note describes, not a defect.

## 8. Test quality

6 tests, all using real `fs.mkdtemp`-backed temp directories via
`makeTmpRepo`/`seedSkillDir` (`_fixtures.mts:76-80`) — real directories and
real `SKILL.md` files on disk, not mocked `fs` calls or a hand-rolled
in-memory tree. This matches the concern the dispatcher raised (hand-authored
fixtures hid real defects in FEAT-284/FEAT-288): here the fixture-building
helper itself does real I/O, so a bug in the recursive walk's actual
filesystem interaction (e.g., symlink handling, `Dirent` type-narrowing) would
surface the same way it would against a real crew checkout. Coverage: leaf-
at-category skill, nested-subcategory skill, a marker-less reference dir that
must be excluded, all four degrade paths, and a relative-path resolution
case. All 6 pass locally (`bun test src/tests/skill-catalog.test.mts` — 6
pass / 0 fail). One gap: no fixture exercises a 2-level-deep nest
(`category/subcategory/skill`, e.g. real-world `backend/dotnet/csharp-
conventions`) — the deepest fixture case is 1 level (`ui/react-engineering`).
Not blocking: I confirmed 2-level nesting works correctly by running the
enumerator against the real `dev-team` tree (finding 1 above), so the
production code path is verified even though the committed unit-test fixture
doesn't cover that depth. Worth a one-line addition in SLICE-2 or a follow-up,
not a reason to reject this slice.

## 9. Scope

Confirmed Decision-1-only: no mapping table, no CLI integration (`loop.mts`
untouched), no preset decommissioning (`scripts/presets/*.json` untouched),
and no writes into `../dev-team` (module is read-only — `fs.readdir`/
`fs.stat`/`fs.access` only, no `fs.write*` calls anywhere in the file).
`git show 25231df2 --stat` confirms exactly the two files claimed, 138 + 111
lines.

## Verification performed

- Read FEAT-230.md, the landed architect contract, `skill-catalog.mts`,
  `skill-catalog.test.mts`, `eval-generator.mts:1-80`, and
  `validate-agent-refs.mts`'s `collectSkillDirNames` (:200-218).
- Ran `enumerateSkillCatalog` directly against the real `../dev-team` checkout
  — **36 skills**, matching the corrected FEAT-230.md figure and an
  independent `find`-based count.
- Checked basename uniqueness across the real 36-entry catalog —
  **no collision exists today**; confirmed the code has no collision guard
  (silent `Map.set` overwrite) for if/when one arises.
- Ran `bun test src/tests/skill-catalog.test.mts` — 6 pass, 0 fail.
- Confirmed zero production callers via repo-wide grep.
- Diffed `resolveCrewRepoPath` against `eval-generator.mts:65-69` —
  character-identical.

## Decision: approved

No blocking findings. Two non-blocking notes carried forward for SLICE-2/5:
(a) no logged warning on a future basename collision (currently latent —
zero collisions in the live 36-skill catalog today), and (b) the fixture
suite's deepest nesting case is 1 level while the real tree has 2-level
nests that I verified pass but that the committed tests don't cover.
