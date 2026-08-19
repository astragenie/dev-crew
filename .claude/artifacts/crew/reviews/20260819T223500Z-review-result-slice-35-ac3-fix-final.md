---
decision: approved
reviewer: crew:reviewer
slice: SLICE-35
reviewed_commits: [532f7b38, d4b70758]
supersedes: .claude/artifacts/crew/reviews/20260819T220500Z-review-result-slice-35-skill-matcher.md
---

# Review — SLICE-35 (FEAT-007) final: AC-3 fix re-check, supersedes prior needs_fix

## Summary

This supersedes my prior `needs_fix` review
(`20260819T220500Z-review-result-slice-35-skill-matcher.md`), which found
AC-1/AC-2/AC-4 solid but AC-3 unsatisfied — no CI gate existed that read the
actual `scripts/presets/*.json` files and failed on dead skill-id
references. Follow-up commit `d4b70758` adds
`src/tests/preset-skill-ids.test.mts` (a real `bun test`-run gate over all 6
live preset files) and corrects the dead ids it found in those files. I
independently re-verified the gate reads real files and bites, that the 3
substituted skills are genuine successors (not just plausible-sounding
renames), that all 6 presets are green, and re-adjudicated AC-3's literal
text against what now exists. **AC-3 is now satisfied. Decision: approved**
for the full slice (AC-1/AC-2/AC-3/AC-4 all independently verified across
both commits).

## 1. The gate reads real files and bites — reproduced, not trusted

`src/tests/preset-skill-ids.test.mts` globs `scripts/presets/*.json`
(all 6: dotnet-only, dotnet-python, dotnet-react, dotnet-typescript-vue,
typescript-plugin-dev, typescript-service), extracts every bare
(non-`:`-namespaced) id from `skills`/`fe.skills`/`be.skills`, and asserts
each is present in `enumerateSkillCatalog`'s live result — one test per
preset (6) plus 2 synthetic tests exercising the extraction/check logic
directly. `roles.*.skills` entries are correctly excluded: every current
preset's role skills are cross-plugin-namespaced
(`superpowers:*`/`loop:*`/`runner:*`), a different skill source than
`skills/domain` entirely — confirmed by reading the actual preset JSON
(`roles.pm.skills: ["superpowers:verification-before-completion",
"loop:loop-discipline"]`, etc.), so excluding them is correct, not a
loophole.

`bun test src/tests/preset-skill-ids.test.mts` (before touching anything):
**8 pass, 0 fail**.

**Neuter-proof**: re-added `csharp-pro` to `dotnet-only.json`'s `skills`
array (`["csharp-conventions", "csharp-pro", "backend-advisory",
"database-architecture", "contract-codegen"]`). Reran the gate — **7 pass,
1 fail**, and the failure is exactly:

```
preset "dotnet-only": every referenced skill id is live in skills/domain
AssertionError: preset "dotnet-only" references skill id(s) absent from the
live catalog: csharp-pro
```

Names both the preset and the offending id, exactly as the module header
claims. Restored; `git diff` on the file came back empty (byte-identical to
HEAD); reran — **8 pass, 0 fail** again.

## 2. Replacement skills — verified as genuine successors, not just named similarly

- **`csharp-pro` → `csharp-conventions`**: read the live SKILL.md —
  "C# .NET 10 conventions — architecture, SOLID idioms, approved libraries,
  and code shapes. Use when touching `*.cs` files." A direct, on-point
  backend-C# skill sitting in the same `be.skills` slot csharp-pro
  previously occupied alongside `backend-advisory`/`database-architecture`/
  `contract-codegen`. Sensible.
- **`frontend-advisory` → `fullstack-advisory`**: this one I could verify
  against the *actual deleted skill's own description*, not just infer from
  the name. `git log --diff-filter=D` found the exact deletion commit
  (`2455e70b`, "refactor(skills): tier domain/... + drop frontend-advisory")
  and I read `frontend-advisory`'s original SKILL.md at that commit's
  parent: *"Comprehensive frontend development skill for building modern,
  performant web applications using ReactJS, NextJS, TypeScript, Tailwind
  CSS... source: aitmpl/development/senior-frontend."* Compare
  `fullstack-advisory`'s live description: *"Comprehensive fullstack
  development skill for building complete web applications with React,
  Next.js, Node.js, GraphQL, and PostgreSQL... source:
  aitmpl/development/senior-fullstack."* Same author/source family
  (`aitmpl/development/senior-*`), same commit that dropped
  `frontend-advisory` was explicitly retiering the skill tree — this is a
  deliberate consolidation by the skill's own maintainers, not a
  loosely-related substitute the builder picked. Confirmed sensible with
  primary evidence, not inference.
- **`a11y-advisory` → `react-ui-quality`**: read the live SKILL.md —
  description: *"React UI ship-gate quality checklist. Severity-tiered
  pre-ship checks for interaction, **accessibility**, layout stability..."*,
  and its `triggers` array literally includes `"accessibility ship gate"`
  verbatim. The commit message's specific claim ("whose 'accessibility ship
  gate' trigger is a direct successor") checks out exactly against the live
  file, not just plausible phrasing.
- **`vue-engineering` → deleted, no successor** (in `dotnet-typescript-vue.json`'s
  `fe.skills` only): confirmed via the diff — the array shrank from 5 to 4
  entries with no replacement id added. The commit message discloses this
  honestly as "a real product gap, not a like-for-like fix" rather than
  papering over it. For AC-3's specific scope (the CI gate must not fail on
  referential drift), removing a dead reference is a valid way to correct
  the preset — AC-3 doesn't require full like-for-like skill coverage, only
  that presets stop referencing catalog-absent ids. Whether Vue projects
  now lack adequate frontend-advisory-equivalent skill coverage is a
  legitimate follow-up product question, but it's out of AC-3's scope and
  honestly flagged rather than hidden.

## 3. All 6 presets currently green

`bun test src/tests/preset-skill-ids.test.mts`: **8 pass, 0 fail**
(confirmed twice — before and after the neuter/restore cycle above).

## 4. AC-3 ruling — satisfied

FEAT-007.md AC-3, quoted exactly: *"Given the dotnet-only.json /
dotnet-react.json / dotnet-typescript-vue.json presets referencing
csharp-pro/react-engineering/frontend-advisory/a11y-advisory/vue-engineering,
When the new CI fixture-snapshot validation gate runs, Then it fails on the
currently-dead ids (regression-proving the original defect is caught) until
those presets are corrected or the DEC decommissions preset-driven
resolution."*

- **"the new CI fixture-snapshot validation gate"** — exists now:
  `src/tests/preset-skill-ids.test.mts`, executed by `bun test` (this
  repo's CI gate #13, `bun test src/tests/ --parallel --timeout 60000`),
  not a synthetic-only unit test. It reads the real preset files
  (`readdirSync(presetsDir)` + `JSON.parse(readFileSync(...))`), not a
  hand-built fixture.
- **"fails on the currently-dead ids... regression-proving the original
  defect is caught"** — independently reproduced in §1: reintroducing
  `csharp-pro` makes the gate fail, naming preset and id. This is the exact
  regression-proof AC-3 asks for.
- **"until those presets are corrected"** — the presets ARE now corrected
  (§2), and the gate is green (§3) as a direct consequence, which is
  exactly the AC's stated resolution condition, not a workaround of it.
- `react-engineering` in the AC's own dead-id list was already the FEAT's
  self-acknowledged error (the contract doc's "Corrected drift measurement"
  section says it was never actually dead, just missed by a flat listing) —
  confirmed live in the prior review that it resolves correctly under the
  recursive catalog walk; nothing needed fixing there.

**Ruling: AC-3 is satisfied.** The standalone CI gate this AC required now
exists, demonstrably catches the class of regression it names, and the
specific defect instances it cites are corrected in the checked-in preset
files.

## 5. Regression check on the rest of the slice

Reran the full targeted set after the fix to confirm nothing else moved:

- `bun test src/tests/skill-matcher.test.mts src/tests/skill-catalog.test.mts
  src/tests/cli-resolve-skills.test.mts src/tests/skill-resolution-golden.test.mts
  src/tests/preset-skill-ids.test.mts`: **47 pass, 0 fail**.
- `bun ./src/scripts/validate-imports.mts`: `OK`.
- `bunx tsc --project tsconfig.json --noEmit`: clean.
- `bunx tsc --project tsconfig.test.json --noEmit`: clean.

## Decision rationale

`approved`, superseding the prior `needs_fix`. AC-1 (matcher + recursive
catalog repoint), AC-2 (unresolved surfacing / `--strict`), and AC-4
(byte-stability of the 5 untouched legacy call sites) were already
independently verified in the prior review and are untouched by this fix
commit. AC-3 — the sole gap — now has a real CI-executed gate over the
actual preset files, independently reproduced to bite on a reintroduced
dead id and restore clean; the 3 substituted skills are verified genuine
successors (one confirmed against the deleted skill's own original
description via git history, not inference), and the one true gap
(`vue-engineering` has no live successor) is honestly disclosed as a
product-coverage question rather than concealed as if it were a clean
swap — that disclosure is a follow-up-worthy note for whoever owns AC-4's
DEC, not a defect in this fix. All 6 presets are green, and the rest of the
slice's targeted gates remain green with no regressions introduced by this
follow-up commit.
