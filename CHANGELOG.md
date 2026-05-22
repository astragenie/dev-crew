# Changelog

All notable changes to the `autonomous-loop` plugin are documented here.

## v0.1.17 — 2026-05-22

### Changed
Lint cleanup pass — **24 warnings → 0**. Drops the autonomous-loop hygiene
bar in line with hero-crew. Mostly cosmetic; one bug-shaped fix.

- Removed dead code / unused imports: `CROSS_SLICE_HEADER` (no callers
  after the bridge removal), `findFeatureById` from `claims-sync.mjs`,
  `parseScoresFromBlock` from `grade-parser.mjs`, `mergeFrontmatter` +
  `readGrade` from `grade-writer.mjs`, `shippedWithTarget` (unused
  in retrospective accumulator), `execFile` from `slice-linker.mjs`
  (also `sliceBody` — never consumed from the parsed slice file).
- **bug-shaped** `retrospective.test.mjs`: shed a stray
  `(await buildRetrospective(repo)).report ||` that read a field which
  never existed; the second `buildRetrospective(repo)` call was the
  one whose result the test actually used.
- Complexity reductions via the same table / extracted-helper pattern
  that cleared hero-crew:
  - `runSpecSubcommand` 17 → `SPEC_HANDLERS` table + `parseFeatureEntries`.
  - `runSliceSubcommand` 26 → `SLICE_HANDLERS` table + `requireId`.
  - `extractPhaseGateCommands` 20 → `HINT_PATTERNS` table +
    `classifyCommandHint` + `applyLineHintOverride`.
  - `migrateAdhocInstall` 26 → `buildStackFromCandidates` +
    `extendCursorPastLoopHeaders` + `findContentCutPoint` +
    `computeRemovalEnd`.
  - `createGradeFile` 27 → `resolveGradePrefill` +
    `applyInferredScores` + `patchGradeFrontmatter`.
  - `resolveGradePrefill` 16 → `readSlicePrefillFields` +
    `readFeaturePrefill`.
  - `writeMemorySnapshot` 22 → eight named `renderSnapshot*` helpers.
  - `detectPatterns` 17 → five `detect*Alerts` helpers.
  - `buildReleaseBody` 18 → `groupFeaturesBySpec` +
    `renderGroupSection` + `renderReadyFooter`.
  - `renderMarkdown` 21 (retrospective) → six `renderRetro*` helpers.
  - `completeSlice` 21 → `moveAndStampSlice` + `moveFeatureToDone`
    + `bestEffort` (three concurrent crew-bridge calls).
  - `writeCrewFinalSynthesis` 17 → `renderSynthesisScores` +
    `renderSynthesisDecisions` + `renderSynthesisBody`.

Tests: **142/142 pass**. Lint output now empty.

## v0.1.16 — 2026-05-22

### Added
- **`docs/code-conventions.md`**: per-repo coding conventions adapted
  from `Astragenie.Standards/typescript/coding-conventions.md` for
  plain ESM. Points at the canonical version in hero-crew.

### Changed
- **Test files renamed** to drop release-version prefixes:
  - `tests/v019-integrations.test.mjs` → `tests/integrations.test.mjs`
  - `tests/v0110-synergy.test.mjs` → `tests/synergy.test.mjs`
  - `tests/v0111-claims-stop.test.mjs` → `tests/claims-stop.test.mjs`
- **`scripts/validate-manifests.mjs`**: exports `validateManifests()`
  for in-process testing. Entry-point uses `process.exitCode` instead
  of `process.exit(1)`.

Tests: 142/142 pass.

## v0.1.15 — 2026-05-22

### Changed
- **slice-linker split (Tier B-8)**: extracted the crew-CLI bridge into
  `scripts/lib/slice-linker/crew-bridge.mjs` (216 lines). Exports
  `tryWriteCostReport`, `writeCrewFinalSynthesis`, `writeCrewHandoff`.
  slice-linker.mjs is now 330 lines (was 471). Public API unchanged.
- **phase-gate split (Tier B-8)**: extracted command/stage runners into
  `scripts/lib/phase-gate/runners.mjs` (185 lines). Exports `nowIso`,
  `runStageList`, `runSingleStage`, `runAspireStage`. phase-gate.mjs
  is now 338 lines (was 444). `runPhaseGate` public API unchanged.

Tests: 142/142 pass.

## v0.1.14 — 2026-05-22

### Changed
- **Tooling**: ESLint 9 (flat config) + Prettier 3 added. CI now runs
  `npm ci`, `validate-manifests`, `lint`, `format:check`, tests. New
  `package.json` (devDependencies only) + `package-lock.json`.
- **Code style swept**: prettier --write across `scripts/**/*.mjs` and
  `tests/**/*.mjs`; no semantic changes.
- **CLI registry refactor** (`scripts/autonomous-loop.mjs`):
  - 24 hand-written `if (value === "--foo") { ... }` flag branches
    collapsed into a single `FLAG_SPEC` table.
  - 17-branch command `else if` chain collapsed into a `COMMANDS`
    registry. Lazy imports stay per-handler (cheap startup).
  - File size: 536 → 476 lines (-60).

### Fixed
- `scripts/lib/frontmatter.mjs`: redundant escape `\[` removed inside
  YAML-unsafe character class (ESLint `no-useless-escape`).
- `tests/loop-installer.test.mjs`: aligns happy-path assertion with the
  post-`feat(install): split HARD RULES` template layout — HARD RULES
  summary stays in CLAUDE.md; full rules text lives at
  `.claude/autonomous-loop/rules.md`.

## v0.1.13 — 2026-05-22

### Fixed
- `slice-linker::findHeroCrewCli` no longer hard-codes
  `crew/0.1.0/scripts/crew.mjs` in its fallback list. Now delegates to
  the shared plugin-cache discovery (`findCrewCli` from
  `plugin-identity.mjs`), which finds the newest installed version.
- Removed the absolute Windows path `C:/work/mega/hero-crew/...` from
  the dev fallback list.

### Added
- `scripts/validate-manifests.mjs`: CI step verifying required fields,
  semver parseability, and `marketplace.json` ↔ `plugin.json` version
  alignment.
- CI: validate-manifests runs before tests.
- README: test / release / license badges.

### Requires
- `crew` plugin >= v0.1.12 (unchanged — no new crew CLI surface is
  required by this release).

## v0.1.12 — 2026-05-21

### Fixed
- Install non-idempotency: orphan start markers no longer stack on re-install.

### Added — recent
- `slice-linker`: emit hero-crew `cost-report` on slice complete.
- Synergy Cat 3+4: claims sync, unified stop conditions, workflow state
  unification, memory + synthesis.

### Requires
- `crew` plugin >= v0.1.12.

### Infrastructure
- CI: `node --test tests/*.test.mjs` on push/PR (GitHub Actions).
- README documents marketplace install commands and pins crew version.
