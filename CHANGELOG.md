# Changelog

All notable changes to the `loop` plugin are documented here. Versions
prior to v0.3.0 shipped under the name `autonomous-loop`.

## v0.3.0 — 2026-05-23

### Breaking

- Plugin renamed `autonomous-loop` → `loop`. Marketplace in this repo renamed `autonomous-loop-dev` → `astra`. New install: `/plugin install loop@astra` (via parent marketplace).
- Slash command namespace `/autonomous-loop:*` → `/loop:*`.
- Consumer-repo config file `.claude/autonomous-loop.json` → `.claude/loop.json`.
- Consumer-repo rules dir `.claude/autonomous-loop/` → `.claude/loop/`.
- HTML marker block `<!-- autonomous-loop:start -->` → `<!-- loop:start -->`.

### Migrator

- `/loop:install` auto-detects legacy `autonomous-loop` state in the target repo and migrates: renames config file, renames rules dir, rewrites CLAUDE.md markers in place. Idempotent.

### Notes

- `MIN_CREW_VERSION` unchanged (`0.1.12`).
- Parent marketplace (`hero-crew`) bumps `crew-dev` → `astra` in a separate release.

## v0.1.21 — 2026-05-22

### Added (FEAT-002: mirror blocked + escalated_to_human in slice flow)

Consumes the new crew workflow badges (hero-crew FEAT-006, v0.1.26):

- New `scripts/lib/crew-workflow-reader.mjs`: tolerant reader for
  `.claude/state/crew/workflow-state.json` (+ legacy
  `engineering-os/` path). Returns `{ blocked, escalated }` from the
  current run's gates.
- `slice-linker.mjs::completeSlice` refuses to roll the parent
  feature to `done/` while either gate is set. The slice itself
  still moves + stamps; only the feature transition waits for the
  human to clear the gate. Returns `featureResult.skipped: true` +
  a reason field so callers can act on it.
- `stop-conditions.mjs::checkStopConditions` treats either gate as a
  hard stop. `escalated_to_human` is described as a hard stop in
  the reason text; `blocked` includes `blockedBy` when present.
  Snapshot gains `crewBlocked` + `crewEscalated` booleans.
- `brief.mjs::buildBrief` surfaces `crewGates` in its output so the
  autonomous-loop summary block reflects the crew state.
- 7 new tests in `tests/crew-blocking-gates.test.mjs` cover: missing
  state file (graceful), each gate read individually, stop on
  escalation, stop on blocked, clean snapshot booleans, brief
  surfacing.

### Notes

- Tests: 183/183 pass (was 176 → 7 new). typecheck + lint + format
  clean.
- FEAT-002 closed; backlog moved to `docs/backlog/done/`.
- FEAT-004 (cross-repo `parentRunId`) intentionally remains in
  `pending/` per the FEAT's own "DO NOT BUILD until a concrete
  cross-repo workflow is observed" note.

## v0.1.20 — 2026-05-22

### Added (FEAT-005: snapshot iteration enrichment)

- `writeMemorySnapshot` gains a "Loop telemetry" section in the
  generated `docs/autonomous-loop-snapshot.md`:
  - Iteration count + cap (from `getIterationStatus`)
  - In-window cost trajectory: avg USD per cost-report (parsed from
    cost-report frontmatter under `.claude/artifacts/crew/cost/` +
    legacy `.claude/artifacts/crew/runs/`)
  - Last cost-advisor verdict slot (n/a until populated upstream)
- `renderLoopTelemetry` + `loadCostReportUSDValues` helpers match the
  existing per-section helper pattern in the module.
- Falls back gracefully: with no loop history the section renders
  n/a values; snapshot stays valid for non-loop usage.
- 8 new tests in `tests/memory-snapshot-telemetry.test.mjs`.

### Notes

- Tests: 176/176 pass (was 168 → 8 new). Lint + typecheck + format
  clean.
- FEAT-005 closed; backlog moved to `docs/backlog/done/`.

## v0.1.19 — 2026-05-22

### Added (FEAT-003: cost-advisor signal in stop-conditions)

- `scripts/lib/cost-alert-loader.mjs` — reads the latest cost-report
  artifacts under `.claude/artifacts/crew/runs/` and surfaces a count
  of "high"-severity recommendations across the last N slices.
- `scripts/lib/stop-conditions.mjs` consumes the count and returns
  `shouldStop: true` with reason `cost_alert_high` when the count
  meets `loop.costStopThreshold` (default 1).
- Config: `.claude/autonomous-loop.json::loop.costStopThreshold`.
- 11 new tests in `tests/cost-alert-stop.test.mjs`: low-severity does
  not stop, ≥ threshold high-severity does stop, threshold override,
  missing artifacts → no stop, severity casing tolerance, 3-slice
  window respected.

### Refactor

- `checkStopConditions` complexity 18 → off list via
  `computeBacklogStats`, `appendBacklogExhaustedSignals`,
  `applyWarnAlertSignals`, `appendIterationCapSignals`,
  `appendCostAlertSignals` helpers. Reason / suggestion / blocker
  emission is now per-signal-type, not inline.

### Notes

- Tests: 168/168 pass (was 157 → 11 new). Lint: clean.
- FEAT-003 closed; backlog moved to `docs/backlog/done/`.

## v0.1.18 — 2026-05-22

### Added (FEAT-001: loop iteration cap + runaway halt)

- `scripts/lib/loop-iteration.mjs` — counter persisted under
  `.claude/state/autonomous-loop/iteration.json`. Exports
  `incrementIteration`, `getIterationStatus`, `resetIterationCounter`.
- `scripts/lib/stop-conditions.mjs` consumes the counter. When the
  iteration cap is reached it returns `shouldStop: true` with reason
  `iteration_cap_reached`.
- `phase-gate.mjs::runPhaseGate` increments the counter on every gate
  completion (best-effort; counter write failures never block gate).
- Config: `.claude/autonomous-loop.json::loop.maxIterations` (default
  25). Resolved through `config-resolver.mjs`.
- Installer seeds the counter file on `installLoop`.
- `tests/loop-iteration.test.mjs` adds 15 tests covering: default cap,
  config override, persistence across calls, stop-conditions
  exhaustion, counter reset.

### Notes

- Counter lives in autonomous-loop's own state dir; intentionally not
  written into crew's workflow-state JSON (keeps autonomous-loop
  state out of crew's primary record).
- Until hero-crew FEAT-006 lands (`blocked` badge), the loop emits the
  cap-reached signal in `checkStopConditions` and the agent driving
  the loop is expected to write a final-synthesis explaining the halt.
- Tests: 157/157 pass (was 142 → 15 new). Lint: clean.

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
