# FEAT-007 contract — task-signal skill matcher

Status: draft, for builder handoff. Source: `.claude/artifacts/loop/backlog/triaged/FEAT-007.md`.

## Current state (evidence)

- `src/scripts/loop.mts:571-618` (`runResolveSkillsCommand`) requires
  `--variant <fe|be|single|pm|researcher|architect|document-writer>` +
  `--preset <path>`. No tag-based path exists today.
- `src/scripts/lib/skill-resolver.mts:34` `resolveSkills({presetPath, overridePath, variant})`
  → `pickBlock` reads `preset.fe/.be/.skills/.roles.<role>.skills` — pure
  preset lookup, zero catalog awareness.
- `src/scripts/lib/skill-catalog.mts` (`enumerateSkillCatalog`) walks
  `<crewRepoPath>/skills/domain/**` for `SKILL.md` markers, keyed on
  directory basename, recursive (this repo's `validate-agent-refs.mts`
  convention). **Gated on `opts.config.loop.crewRepoPath`** (line ~54) —
  verified this repo's `.claude/loop.json` has no `crewRepoPath` set, and
  there is no `crew/skills/` tree post-merge; the real tree is
  `skills/domain/**` at repo root. Header comment confirms: **NO PRODUCTION
  CALLER YET** — SLICE-1 of the old FEAT-230 landed only the enumerator.
- Live tree confirmed via `find skills/domain -name SKILL.md`: 37 skills,
  several nested (e.g. `skills/domain/ui/react-engineering/SKILL.md`).
- **Dead-ID re-verification** against `scripts/presets/dotnet-only.json`,
  `dotnet-react.json`, `dotnet-typescript-vue.json`: `csharp-pro`,
  `frontend-advisory`, `a11y-advisory`, `vue-engineering` have **no** matching
  directory or SKILL.md frontmatter `name:` anywhere under `skills/domain/`
  — genuinely dead. **Correction to the FEAT's own list**: `react-engineering`
  is **not** dead — it lives nested at `skills/domain/ui/react-engineering/`
  and resolves fine under a recursive, basename-keyed walk (this is exactly
  the "flat listing produces false-negative missing skills" case the FEAT's
  own "Corrected drift measurement" section warns about).
- Full caller inventory of `resolve-skills` (grep, repo-wide, excludes
  CHANGELOG/docs history): `commands/orchestrate-slice.md:154-166` (3 calls:
  `--variant fe`, `--variant be`, `--variant single`), `skills/pm-rescope/SKILL.md:45-48`,
  `skills/triage/SKILL.md:60-63` (both `--variant pm`). **5 call sites total,
  all `--variant`+`--preset`, none touch the new path.**

## Matcher table shape

New module `src/scripts/lib/skill-matcher.mts`, sibling to `skill-resolver.mts`:

```ts
export interface TaskSignal {
  /** FEAT/slice frontmatter tags, e.g. ["stack:typescript", "concern:agent-reporting"].
   *  Same taxonomy this triage pass just wrote into FEAT-007..019 frontmatter. */
  tags: string[];
}

export interface SkillMatchRule {
  tag: string;        // exact tag string, e.g. "stack:typescript"
  skillIds: string[]; // candidate skill ids — validated against the live catalog at resolve time
}

export interface SkillMatchResult {
  skills: string[];              // deduped, catalog-verified
  source: "task-signal-matcher"; // distinguishes from legacy SkillSource values
  unresolved: string[];          // rule-table ids absent from the live catalog — AC-2 trigger
}
```

The rule table (`skill-matcher-table.mts`, plain data) only keys on
`stack:*` and `concern:*` prefixes — `area:*` is repo-local bucketing (see
this triage pass's own FEAT-007..019 tags), too fine-grained to generalize
across repos, so it is not a matcher key. `surface:*` (used by
`risk-classifier.mts:15-16`, e.g. `surface:schema`/`surface:api`) is
included per AC-1's literal wording.

`matchSkills(signal, catalog)`: for each tag present on `signal.tags`, union
the rule's `skillIds`; filter the union against `catalog` (from
`enumerateSkillCatalog`, **re-pointed to walk `<repoPath>/skills/domain`
directly** — the `loop.crewRepoPath` gate is dead code post-merge and must
be dropped in this slice, not carried forward); ids not in `catalog` go to
`unresolved` and fail loudly (AC-2), never silently drop.

## resolve-skills CLI surface

Additive only — the 5 existing `--variant`+`--preset` call sites above are
**untouched**, no migration needed for them:

```
resolve-skills --variant <v> --preset <path> [--override <path>]   # unchanged legacy path
resolve-skills --slice <SLICE-id> [--preset <path>]                # NEW: reads slice frontmatter tags
resolve-skills --tags <comma-separated>                            # NEW: direct tag list
```

`--slice`/`--tags` route through `matchSkills`; if the match set is empty
(no rule matched, or all matched ids were `unresolved`), fall back to the
legacy `pickBlock` preset path **only if `--preset` was also given** (AC-1);
otherwise exit 2 (no-match), same convention `runResolveSkillsCommand`
already uses. `--strict` (currently a documented no-op, `loop.mts:594-597`)
becomes live here: fail on any `unresolved` id rather than warn.

## DEC to file (content, not the formal artifact — file under
`.claude/artifacts/loop/decisions/` per AC-4 when this FEAT executes)

Decommission `preset.roles.*.skills` / `preset.fe.skills` / `preset.be.skills`
/ `preset.skills` as skill *source of truth*; the task-signal matcher above
becomes primary. Presets keep `fe`/`be`/`roles.*` blocks as the **fallback**
path only (needed for the 5 existing `--variant` callers, which are out of
this FEAT's scope to migrate). Migration posture: no call site is forced to
adopt `--slice`/`--tags` in this slice — this DEC only changes which path is
*preferred* when both are available, and records that a future FEAT should
migrate `commands/orchestrate-slice.md`'s 3 calls once slice frontmatter
tags are populated for every dispatched slice (today only FEAT frontmatter
carries `tags:`, per this triage pass — slices don't yet).

## Open questions

- Slice frontmatter does not currently carry a `tags:` field (only FEATs do,
  as of this triage pass) — `--slice <id>` needs a defined inheritance rule
  (copy FEAT tags down at slice-create time, or read-through to the parent
  FEAT at resolve time?). Not decided here; builder should pick one and note
  it in the slice's own handoff.
- `enumerateSkillCatalog`'s repointing (drop `crewRepoPath` gate) is a
  breaking change to that module's only documented contract
  (`.claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md`,
  Decision 1) — confirm no other in-flight FEAT still assumes the
  `crewRepoPath`-gated behavior before landing.
