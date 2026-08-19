# FEAT-218 Phase 1 — preset layer analysis

Status: analysis only, no code deleted. Written to satisfy AC-1 of
`.claude/artifacts/loop/backlog/pending/FEAT-218.md`.

## 1. What presets provide today

A preset is `scripts/presets/<name>.json`, `schemaVersion: 1`, validated at
CI time by `validatePreset` (`src/scripts/lib/preset-schema.mts:42`). Six
ship today: `dotnet-only`, `dotnet-python` (default), `dotnet-react`,
`dotnet-typescript-vue`, `typescript-plugin-dev`, `typescript-service`.

Fields present in the actual JSON files (`scripts/presets/dotnet-python.json`,
`scripts/presets/typescript-plugin-dev.json`, `scripts/presets/dotnet-react.json`
read directly):

| Field | Purpose | Example |
|---|---|---|
| `schemaVersion`, `presetName`, `description` | identity | `1`, `"dotnet-python"` |
| `projectType` | one of `claude-plugin/library/service/saas` | `"saas"` |
| `split` | whether builder dispatch is FE+BE (`fe`/`be` blocks) or single-surface (`skills`) | `true` |
| `frontend` / `backend` / `contract` / `deployment` | stack identity strings (informational, not consumed by any resolver logic found) | `{framework:"react",language:"typescript"}` |
| `loop.*` | path overrides + loop-runner knobs (`aiLoopRoot`, `backlogPath`, `slicesRoot`, `backlogRoot`, `specsRoot`, `gradesRoot`, `decisionsRoot`, `phaseGateArtifactDir`, `maxIterations`, `marathonMode`) | |
| `stack.build` / `stack.test` / `stack.frontendBuild` / `stack.infraPlan` / `stack.aspireBoot` / `stack.healthchecks` | phase-gate command stages, each `{cmd,args,cwd?}` or `null` to disable | |
| `reviewers.ladder` | reviewer fan-out preset (`["A","B"]` etc.) | |
| `mandatoryDocs` | doc paths phase-gate checks exist | |
| `productName` / `productDescription` | placeholder strings the installer writes, meant to be overridden post-install | |
| `stackDescription` | free-text Markdown blurb | |
| `fe.skills` / `be.skills` (when `split:true`) OR top-level `skills` (when `split:false`) | builder-dispatch skill-injection payload | |
| `roles.pm` / `roles.researcher` / `roles.architect` / `roles.document-writer` | per-role skill lists for `runner:*` agents | |

**Important discrepancy found**: `preset-schema.mts`'s `PresetV1` interface
(`src/scripts/lib/preset-schema.mts:19-33`) and `validatePreset` only
declare/validate `schemaVersion`, `presetName`, `description`, `projectType`,
`split`, `frontend`, `backend`, `contract`, `deployment`, `skills`, `fe`,
`be`, `roles`. **It does not validate `loop.*`, `stack.*`, `reviewers`,
`mandatoryDocs`, `productName`, `productDescription`, or `stackDescription`**
even though every shipped preset carries them and `config-resolver`/
`loop-installer`/`phase-gate` all read them at runtime. The schema is
stale relative to the real preset shape — a preset could ship a broken
`stack.test` entry and CI's `validateAllPresets` gate would not catch it.

## 2. Every consumer (file:line)

**Core preset machinery**
- `src/scripts/lib/config-resolver.mts` — `listPresets` (:28), `loadPreset`
  (:46), `resolveConfig` (:100) which does `options.preset ||
  userConfig?.preset || "dotnet-python"` (:102) then `deepMerge(preset,
  userConfig)` (:105). This is the hardcoded `dotnet-python` default
  AC-5 wants removed.
- `src/scripts/lib/preset-schema.mts` — `validatePreset` (:42), `VALID_ROLES`
  (:12), `PresetV1` type (:19). Consumed by `skill-resolver.mts` and
  `validate-manifests.mts`.
- `src/scripts/lib/skill-resolver.mts` — `resolveSkills` (:33) takes a raw
  `presetPath` (a JSON file path, not a name), an optional `overridePath`,
  deep-merges them, validates via `validatePreset`, then `pickBlock` (:67)
  selects `fe`/`be`/`skills`/`roles.<role>` per `variant`. This does **not**
  go through `config-resolver` — it reads whatever path the CLI caller
  passes.

**CLI surface**
- `src/scripts/loop.mts:703-735` (`runResolveSkillsCommand`) — the
  `resolve-skills` subcommand; requires `--preset <path>` (a filesystem path,
  not a name) and `--variant fe|be|single|<role>`, optional `--override
  <path>`.
- `src/scripts/loop.mts` `install` command path calls
  `loop-installer.mts` which calls `resolveConfig`.
- `commands/list-presets.md` — shells out to `loop.mts list-presets`,
  documents all 6 built-in presets by name/description; also gives the
  "author a new preset file + reinstall to pick it up" workflow.
- `commands/install.md:32` — `bun ".../loop.mts" install --repo "$PWD"
  --preset dotnet-python`, and notes omitting `--preset` falls back to
  "whatever preset is already recorded in `.claude/loop.json`, or the
  default if no config exists".
- `commands/status.md:3,18` — reports "active preset name" as part of
  `/devcrew:brief` output.

**Installer / phase-gate**
- `src/scripts/lib/loop-installer.mts:77,94,109,117,129` — calls
  `resolveConfig(repoPath, {preset: options.preset})`, writes
  `config.preset` into the emitted `.claude/loop.json`, reports it back.
- `src/scripts/lib/phase-gate.mts:6,30,44,208,259,299,402` — calls
  `resolveConfig`, reads `config.stack.*` stage commands, reports
  `Preset: ${config.preset}` in its Markdown summary, and treats a stage as
  `_skipped (not configured for this preset/repo)_` when `null`.

**CI validation**
- `src/scripts/validate-manifests.mts:10,34-46,195-196` —
  `validateAllPresets(repoRoot)` walks `scripts/presets/*.json`, calls
  `validatePreset` on each, fails CI on schema errors. This is the only
  place all 6 preset files are read as a batch and cross-checked.

**Comment-only references (no functional coupling)**
- `src/scripts/lib/slice-linker/feature-lifecycle.mts:256` — comment noting
  surface/stack classification is superseded by preset-driven skills.
- `src/scripts/lib/classify-parser.mts:11,102,104` — comments explaining why
  surface/stack frontmatter lines are intentionally unparsed now that
  presets own that.
- `src/scripts/lib/wave/real-deps.mts:86` — comment describing
  `resolveConfig`'s merge behavior, no code dependency.

**Tests** — 45 files under `src/tests/` reference a preset name, `loadPreset`,
`resolveConfig`, `validatePreset`, or `resolveSkills` (grep count above the
FEAT's own "~30" estimate). Three carry real preset-behavior assertions and
would need a rewrite, not just a literal swap:
- `src/tests/config-resolver.test.mts` (122 lines) — asserts the
  `dotnet-python` default, deep-merge semantics, explicit-`null`-disables
  semantics, unknown-preset error message.
- `src/tests/preset-schema.test.mts` (157 lines) — schema validation matrix
  (split true/false, roles, bad schemaVersion, etc.).
- `src/tests/skill-resolver.test.mts` (179 lines) + `src/tests/cli-resolve-
  skills.test.mts` (98 lines) — `resolveSkills`/CLI behavior across
  variants, override merging, split mismatches.
- `src/tests/loop-installer.test.mts` (318 lines) and
  `src/tests/phase-gate.test.mts` (108 lines) — installer/phase-gate
  integration through `resolveConfig`.

The remaining ~38 files import `PRESET_DOTNET = "dotnet-python"` from
`src/tests/_fixtures.mts:41` purely to produce a valid `.claude/loop.json`
fixture for unrelated tests (slice ceremony, grading, retrospectives, etc.)
— they don't test preset logic itself and would only need the fixture
constant's value swapped, not a logic rewrite.

## 3. What breaks if presets vanish

**a. The skill-injection contract is cross-plugin, and the coupling is a
hardcoded file path, not just a shared JSON shape.** `dev-team`
(hero-crew)'s `commands/orchestrate-slice.md:139-162` (Step 2.5) does:

```bash
PRESET_NAME=$(grep -oP '"preset"\s*:\s*"\K[^"]+' .claude/loop.json 2>/dev/null)
...
node "${LOOP_ROOT}/scripts/loop.mts" resolve-skills \
  --variant fe \
  --preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json" \
  --override .claude/loop.json
```

This is a **direct, hardcoded reference to `scripts/presets/<name>.json`
inside the loop plugin's install directory**, constructed from the
`preset` field it greps out of the consuming repo's `.claude/loop.json`.
Confirmed via `grep -rn "scripts/presets" C:/work/mega/dev-team` — the only
hits are this file (plus stale copies under `dev-team/.claude/worktrees/`).
No `.ts`/`.mts` code in dev-team touches `scripts/presets/` — the coupling
lives entirely in this one Bash step of one command markdown file, and it
is unconditional: no fallback path if `scripts/presets/${PRESET_NAME}.json`
is missing, it just fails that `resolve-skills` invocation (which
`orchestrate-slice.md:166-171` treats as "no block" per
`docs/superpowers/specs/2026-07-04-crew-architecture-review-REPORT.md:35`,
so it degrades gracefully to *no skill injection* rather than crashing —
but that's silent capability loss, not a clean break).

**This is the biggest risk in the FEAT and it is real**: deleting
`scripts/presets/*.json` breaks hero-crew's builder skill-injection for
every consumer repo, silently, unless `orchestrate-slice.md` Step 2.5 is
updated in the same window. This makes Phase 2 a **coordinated two-repo
change**, not a loop-only deletion.

**b. `--variant fe|be|single` resolution** depends on `split` +
(`fe`/`be` vs `skills`) which currently lives only in the preset file.
Whatever replaces it must preserve exactly the same `split` boolean and
`fe.skills`/`be.skills`/`skills` shape, because `resolveSkills`'s
`pickBlock` (`skill-resolver.mts:67-86`) branches on it byte-for-byte.

**c. The "install with one flag" UX** (`--preset dotnet-python` at install
time, `/devcrew:list-presets` to browse options) is a real onboarding
affordance. Removing it without a replacement forces every new repo to
hand-author a `.claude/loop.json` from scratch — a regression for the
"pick a preset closest to your stack" flow documented in
`commands/list-presets.md`.

**d. The `dotnet-python` hardcoded default** (`config-resolver.mts:102`) is
already flagged as wrong-for-most-repos in the FEAT triage notes and in
AC-5. Any repo with no `.claude/loop.json` and no explicit `--preset`
silently gets .NET/Python/Aspire stack commands, which is actively
misleading for e.g. a bare TypeScript repo running `/devcrew:install` with
no flags.

## 4. Migration path

**Recommended (matches the FEAT's proposal): installer-time inlining, then
delete.**

1. `/devcrew:install --preset X` becomes a one-time *scaffolder*: it still
   reads `scripts/presets/X.json` (or, post-Phase-2, an install-time-only
   template directory) but writes the **fully-resolved** content directly
   into `.claude/loop.json` — `loop.*`, `stack.*`, `reviewers.ladder`,
   `mandatoryDocs`, `productName`/`productDescription`, `stackDescription`,
   `fe`/`be`/`skills`, `roles.*` all inlined, not referenced by name.
2. `resolveConfig` drops the preset load/merge entirely and the
   `dotnet-python` default (AC-5): it reads `.claude/loop.json` directly. For
   an unconfigured repo (no `.claude/loop.json`), it throws a clear error
   ("run `/devcrew:install` first") rather than silently assuming a stack —
   preferred over a hardcoded minimal skeleton because a skeleton with empty
   `stack.build`/`stack.test` would make phase-gate silently no-op instead of
   telling the operator to configure it.
3. `skill-resolver.mts`'s `resolveSkills` keeps its current signature
   (`presetPath` + optional `overridePath` + `variant`) but is repointed:
   dev-team's `orchestrate-slice.md` Step 2.5 changes
   `--preset "${LOOP_ROOT}/scripts/presets/${PRESET_NAME}.json"` to
   `--preset .claude/loop.json` and **drops `--override`** (the repo config
   *is* the fully-resolved config now, there's nothing left to layer on top
   of it). This is the one required cross-repo edit — coordinate the loop
   Phase-2 slice and a matching dev-team slice so they land together (or
   land dev-team's change first with a fallback that tries `.claude/loop.json`
   when `scripts/presets/` is absent, then land loop's deletion after).
4. `validatePreset`/`preset-schema.mts` is repurposed into a
   `.claude/loop.json` validator — same shape checks (`split` consistency,
   role names, skill arrays), plus (fixing the discrepancy found in §1)
   actual validation of `loop.*`, `stack.*` stage shape, `reviewers.ladder`,
   since a hand-or-agent-edited `.claude/loop.json` now needs the same
   guardrails a preset file used to get for free from
   `validateAllPresets` in CI.
5. `scripts/presets/*.json` demoted to **install-time templates only**
   (recommended over outright removal): keep the 6 files as the seed data
   `/devcrew:install --preset X` reads once, but nothing at runtime ever
   loads them again post-install. `commands/list-presets.md` keeps working
   unchanged (it's just enumerating template choices). This preserves the
   "install with one flag" UX (§3c) at zero runtime cost, and it means
   Phase 2 does **not** need `scripts/presets/` deleted — `resolveConfig`
   simply stops being one of its readers. AC-2's grep gate
   (`grep -rn "scripts/presets" src commands` → zero *runtime* reads) is
   satisfied because the only remaining reader is the installer's one-time
   scaffold path, which the AC's own carve-out language allows ("matches
   only in retired/template code").
6. `--preset` flag on `/devcrew:install` survives as the template selector
   (recommended per the FEAT's own risk note) — same flag, same values,
   different plumbing underneath.

**Alternatives considered and rejected:**

- *Keep presets, just fix the `dotnet-python` default and the schema gap.*
  Cheaper short-term but doesn't address the operator's actual complaint
  (6 overlapping files + a name-indirection layer sitting between the repo
  and its own config). Leaves the cross-plugin path coupling (§3a) exactly
  as fragile as today.
- *Ship a single hardcoded default, drop presets and `--preset` entirely.*
  Removes the "pick closest to your stack" UX with no replacement — every
  repo starts from one stack shape and hand-edits everything, which is a
  worse first-run experience than today for the .NET/Aspire monorepo case
  presets were built for. Also does not shrink the file count problem so
  much as delete a genuinely useful (if overgrown) feature.

Recommendation: **install-time inlining + template demotion**, not full
deletion of `scripts/presets/`. It gets the operator's actual ask (repo's
`.claude/loop.json` is the one source of truth `resolveConfig` reads from,
no more indirection at runtime) while keeping the low-cost onboarding UX
and avoiding an unconditional two-repo synchronized deletion.

### Proposed Phase 2 slice breakdown

1. **SLICE A — `resolveConfig` self-contained mode.** Add a code path where
   `resolveConfig` reads `.claude/loop.json` directly with no preset merge
   when the file is fully populated (has `stack`, `loop`, `fe`/`be` or
   `skills`); keep the preset-merge path only inside `loop-installer.mts`'s
   scaffold step. Golden test: resolved skills for each of the 6 presets are
   byte-identical before/after (AC-4).
2. **SLICE B — installer inlining.** `loop-installer.mts` writes the fully
   merged preset content into `.claude/loop.json` at install time instead
   of `{preset: "name", ...overrides}`. Update `loop-installer.test.mts`.
3. **SLICE C — schema migration.** Repurpose `preset-schema.mts` /
   `validate-manifests.mts`'s `validateAllPresets` into a `.claude/loop.json`
   validator; extend the schema to cover `loop.*`/`stack.*`/`reviewers`/
   `mandatoryDocs` (closing the §1 gap). Update `preset-schema.test.mts`.
4. **SLICE D — cross-plugin coordination (dev-team).** Update
   `commands/orchestrate-slice.md` Step 2.5 to call `resolve-skills --preset
   .claude/loop.json` (no `--override`), with a fallback to the current
   `scripts/presets/${PRESET_NAME}.json` path when `.claude/loop.json`
   isn't self-contained yet (covers the migration window / repos that
   haven't reinstalled). Land in dev-team, not loop.
5. **SLICE E — remove `dotnet-python` default + error path.** `resolveConfig`
   throws a clear "run /devcrew:install" error for a missing config instead
   of defaulting (AC-5). Update `config-resolver.test.mts`.
6. **SLICE F — docs + DEC record.** Update `README.md`, `commands/install.md`,
   `commands/list-presets.md` (now "install-time templates" language),
   CLAUDE.md's "Backlog discipline" preset paragraph; write the DEC-*
   record (AC-7).
7. **SLICE G — literal-to-fixture test sweep.** Sweep the ~38 fixture-only
   tests off `PRESET_DOTNET` import if `_fixtures.mts` changes shape as a
   side effect of Slice A/B; otherwise no-op.

Sequencing: A → B → E can land together (loop-only, backward compatible via
fallback). C is independent, can land any time after A. D must land in
dev-team and should be verified against a loop repo running the new
self-contained config *before* F's docs claim the migration is complete.
`scripts/presets/*.json` files themselves are **not deleted** in any of
these slices under the recommended path — only demoted to install-time-only
reads, so AC-2's "zero runtime reads" is satisfied without touching the
files on disk.

## Refs

- `src/scripts/lib/config-resolver.mts`
- `src/scripts/lib/preset-schema.mts`
- `src/scripts/lib/skill-resolver.mts`
- `src/scripts/lib/loop-installer.mts`
- `src/scripts/lib/phase-gate.mts`
- `src/scripts/validate-manifests.mts`
- `src/scripts/loop.mts` (`runResolveSkillsCommand`, install/list-presets dispatch)
- `commands/list-presets.md`, `commands/install.md`, `commands/status.md`
- `scripts/presets/*.json` (6 files)
- `C:/work/mega/dev-team/commands/orchestrate-slice.md` (Step 2.5, lines
  ~129-172) — the cross-plugin coupling point
- `src/tests/config-resolver.test.mts`, `preset-schema.test.mts`,
  `skill-resolver.test.mts`, `cli-resolve-skills.test.mts`,
  `loop-installer.test.mts`, `phase-gate.test.mts`, `_fixtures.mts`
