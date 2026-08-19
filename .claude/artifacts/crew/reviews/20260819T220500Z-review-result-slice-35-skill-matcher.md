---
decision: needs_fix
reviewer: crew:reviewer
slice: SLICE-35
reviewed_commits: [532f7b38]
---

# Review — SLICE-35 (FEAT-007): task-signal skill matcher + resolve-skills --slice/--tags

## Summary

Commit `532f7b38` adds `skill-matcher.mts`/`skill-matcher-table.mts` (a
stack:/concern:/surface: tag → skill-id rule table validated at resolve
time against the live catalog), repoints `skill-catalog.mts` off the dead
`loop.crewRepoPath` gate, and wires additive `--slice`/`--tags` flags onto
`resolve-skills`. AC-1, AC-2, and AC-4 are solid — independently verified,
not just trusted. **AC-3 is not satisfied as literally written** (the
builder's own "PARTIAL" self-flag is correct): FEAT-007.md requires "the
new CI fixture-snapshot validation gate" to fail on the three named presets
(`dotnet-only.json`/`dotnet-react.json`/`dotnet-typescript-vue.json`)
referencing dead skill ids, and no such standalone gate exists — the
mechanism this slice built only covers the brand-new `--slice`/`--tags`
path, never the legacy `--variant`+`--preset` path the named presets
actually flow through. **Decision: needs_fix**, scoped precisely to AC-3;
AC-1/AC-2/AC-4 and the documented contract deviation need no rework.

## 1. `--variant` byte-stability — independently verified via isolated worktree

Built a detached worktree at `532f7b38^` (`git worktree add --detach
/tmp/slice35-prehead 532f7b38^`) so the comparison never touched the shared
working tree (a concurrent autonomous-loop process is actively writing to
it, same situation flagged in the SLICE-28/32 reviews). Ran the real
invocation shapes from `commands/orchestrate-slice.md` and
`skills/triage/SKILL.md` against both HEAD and the pre-commit worktree:

- `resolve-skills --variant fe --preset .claude/loop.json` → exit `2` on
  both (this repo's `.claude/loop.json` has no `fe` block — expected, and
  identical on both sides).
- `resolve-skills --variant be --preset .claude/loop.json` → exit `2` on
  both, same reasoning.
- `resolve-skills --variant pm --preset scripts/presets/typescript-plugin-dev.json
  --override .claude/loop.json` → **byte-identical JSON stdout** on both
  sides (`skills`, `source: "preset.roles.pm"`, `dispatchInstructionBlock`
  all matched exactly) and exit `0` on both.

Byte-stability confirmed for all three tested shapes. Worktree removed
after (`git worktree remove --force`).

## 2. Real-repo neuter-proof — confirmed it bites

Reverted `walkSkillDirs` in `skill-catalog.mts` to a flat (non-recursive)
walk by removing its self-recursion call. Ran `skill-catalog.test.mts`:
**4 pass, 2 fail** — exactly the two tests the neuter should break:

- The fixture test (`finds leaf-at-category and nested-subcategory skills`)
  — `react-engineering` missing from the resulting id list.
- **The real-repo test** (`against this repo's real skills/domain: nested
  react-engineering resolves...`) — failed on `"nested skill must be found
  by the recursive walk"`, exactly as predicted, because
  `react-engineering` only exists at `skills/domain/ui/react-engineering/`
  in the live tree.

Restored the recursion; `git diff` on the file came back empty
(byte-identical to HEAD); reran — **6 pass, 0 fail**.

## 3. Matcher table honesty + live `unresolved`/`--strict` behavior

Enumerated the live catalog directly (`find skills/domain -name SKILL.md`)
— **37 skills**, matching the contract doc's count. Checked 6 rules from
`skill-matcher-table.mts` against that live list:

| Rule | skillIds | Live? |
|---|---|---|
| `stack:react` | react-engineering, react-ui-quality | both present (`ui/`) |
| `concern:security` | security-advisory, security-sweep | both present |
| `concern:database` | database-architecture | present (`backend/`) |
| `surface:api` | api-architecture, openapi-authoring, contract-codegen | all present |
| `concern:mobile-design` | mobile-design | present (`mobile/`) |
| `stack:dotnet` | csharp-conventions, aspnetcore-patterns, ef-core-patterns | all present (`backend/dotnet/`) |

All 6 check out. `stack:vue`'s `vue-engineering` is confirmed **absent**
from the live tree, matching the documented deliberate-dead-rule design.

Live CLI verification (real repo, no fixtures):
- `resolve-skills --tags stack:vue` → `warn: no skills resolved from tags
  (unresolved: vue-engineering)`, exit `2`.
- `resolve-skills --tags stack:vue --strict` → `error: unresolved skill
  id(s) not present in the live catalog: vue-engineering`, exit `1`.
- `resolve-skills --tags stack:react` → clean JSON, both skills resolved,
  `unresolved: []`, exit `0`.

All three match the documented contract exactly.

## 4. AC-3 adjudication — needs_fix, precisely scoped

FEAT-007.md AC-3, quoted exactly: *"Given the dotnet-only.json /
dotnet-react.json / dotnet-typescript-vue.json presets referencing
csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering,
When **the new CI fixture-snapshot validation gate** runs, Then it fails on
the currently-dead ids (regression-proving the original defect is caught)
until those presets are corrected or the DEC decommissions preset-driven
resolution."*

This names a specific artifact — a standalone CI validation gate that scans
those three actual preset JSON files' skill-id references against the live
catalog and fails on dead ones. Checked for it and it does not exist:

- No new `validate-*.mts` script was added in this commit (diff only
  touches `cli-args.mts`, `skill-catalog.mts`, `skill-matcher*.mts`,
  `skill-resolver.mts`, `loop.mts`, and 3 test files).
- Grepped the new/changed test files for the three named preset filenames
  or the specific dead-id list — the only hits are `skill-matcher.test.mts`
  using a **synthetic in-memory rule table** (`{ tag: "stack:csharp-legacy",
  skillIds: ["csharp-pro", "frontend-advisory", "a11y-advisory"] }`, not the
  real preset files) and `skill-catalog.test.mts`'s real-repo test (§2
  above), which only confirms the *catalog enumerator* excludes those ids —
  it never reads `dotnet-only.json`/`dotnet-react.json`/
  `dotnet-typescript-vue.json` or asserts anything about what happens when
  those presets are actually resolved.
- Checked whether the mechanism this slice DID build (the `unresolved`
  array + `--strict`) covers the gap indirectly: it doesn't. That mechanism
  only fires on the brand-new `--slice`/`--tags` path through
  `matchSkills`/`SKILL_MATCH_TABLE`. The three named presets are only ever
  read through the **legacy** `--variant`+`--preset` path
  (`runVariantResolveSkills` → `pickBlock`), which the commit message and
  in-code comment both confirm is "verbatim... UNCHANGED" — confirmed
  directly in `loop.mts`: `--strict` on that path still only prints `warn:
  --strict is reserved for a future skill-ID-lint registry and is a no-op
  today`, exactly as before this slice. So even an operator manually running
  `resolve-skills --variant be --preset scripts/presets/dotnet-react.json
  --strict` today would **not** be told `csharp-pro` is dead — the legacy
  path has zero catalog awareness, unchanged.

**Ruling: AC-3 is not satisfied.** The exact defect it names — the three
listed presets silently referencing skill ids that don't exist in the live
catalog — remains completely unguarded by CI after this slice, identical to
before it. This is not a matter of interpretation: AC-3's Given clause names
the specific preset files and the specific dead ids, and its Then clause
names "the new CI fixture-snapshot validation gate" as a distinct artifact
this FEAT was supposed to produce. FEAT-007 has exactly one slice
(`slices: [SLICE-35]`, no carry-forward note deferring AC-3 the way FEAT-009
explicitly deferred its AC-3/AC-8b to a separate FEAT) — so there is no
scope basis to treat this as intentionally out-of-slice the way that other
recent review's AC-3 deviation was. **Needs_fix**: add a validator (likely
a new `bun ./src/scripts/validate-*.mts` gate, or at minimum a test that
parses the three named preset JSON files' `fe`/`be`/`roles.*` skill-id
arrays and asserts each id is present in `enumerateSkillCatalog`'s live
result, failing the run — i.e., actually exercised by `bun test` or a CI
gate — on the currently-known-dead ids) before this AC can be marked
satisfied.

## 5. Deviation judgment — fine, not a defect

The contract sketches `resolve-skills --slice <id> [--preset <path>]` with
`--preset` alone sufficient to enable the legacy-preset fallback. The
builder instead requires both `--preset` **and** `--variant`. Checked
`resolveSkills`'s actual signature (`skill-resolver.mts`): it calls
`pickBlock(preset, variant)` internally, and `pickBlock` has no
variant-less mode — a preset file is structured as named
role/variant-scoped blocks (`fe.skills`, `be.skills`, `roles.pm.skills`,
...), so there is no way to select *which* block to fall back to without a
variant signal. The contract's sketch under-specifies this; the builder's
narrowing is the only implementable reading, not an arbitrary shortcut, and
it's clearly documented both in the commit message and in a code comment at
the exact branch. Since `--slice`/`--tags` is a brand-new additive path
with zero existing callers, no real caller is broken by this narrowing.
**Assessed as fine — not a defect, no fix needed.**

## 6. Targeted gates

- `bun test src/tests/skill-matcher.test.mts src/tests/skill-catalog.test.mts
  src/tests/cli-resolve-skills.test.mts`: **33 pass, 0 fail**.
- `bun test src/tests/skill-resolution-golden.test.mts`: **6 pass, 0 fail**.
- `bun ./src/scripts/validate-imports.mts`: `OK`.
- `bunx tsc --project tsconfig.json --noEmit`: clean, no output.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean, no output.

## Decision rationale

`needs_fix`, scoped to AC-3 only. AC-1 (matcher + recursive catalog repoint)
is independently verified as correct via a real neuter-proof reproduction
and live-catalog spot checks; AC-2 (unresolved surfacing / `--strict`) is
independently verified live against the real repo for both the resolved and
unresolved cases; AC-4 (byte-stability of the 5 untouched legacy call
sites) is independently verified via an isolated pre/post worktree
comparison, not just trusted from the "verbatim" claim; the `--preset`+
`--variant` fallback deviation is a necessary, well-documented consequence
of `pickBlock`'s real signature and breaks nothing. AC-3 alone is unmet:
FEAT-007.md explicitly requires a standalone CI fixture-snapshot gate over
the three named preset files, and no such gate — nor any test that reads
those actual files — exists after this slice; the new `unresolved`/
`--strict` machinery is real and correct but scoped only to the new
`--slice`/`--tags` path, leaving the legacy `--variant`+`--preset` path
(the one the three named presets are actually consumed through) with zero
catalog awareness, unchanged from before this slice. The fix is narrow: add
a gate/test that actually reads those three preset files' skill-id
references and fails when one is absent from the live catalog.
