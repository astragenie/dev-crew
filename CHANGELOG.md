# Changelog

All notable changes to the `loop` plugin are documented here. Versions
prior to v0.3.0 shipped under the name `autonomous-loop`.

## v0.5.1 — 2026-05-28 — perf: pre-load slice context into builder and reviewer prompts

### Performance

Lead agent now embeds context inline before dispatching subagents, eliminating
cold-start re-reads that caused 10–15 wasted tool uses per slice.

**Builder dispatch (`buildDispatchInstruction`)**
- Full slice `.md` content appended as `## Slice context (pre-read)` block.
- First 400 chars of linked feature's `## Description` appended as feature excerpt.
- Builder skips ~3 file re-reads and starts framing immediately.

**Reviewer prompts (`buildReviewLadder`)**
- New `extractFilesSection()` helper extracts `**Files:**` / `## Files` block
  from slice content and injects it before "What to do" in every reviewer prompt.
- New `runGitDiffStat()` helper captures `git diff HEAD~1 --stat` and injects it
  alongside the files list.
- Each reviewer skips ~4–6 tool uses (file discovery + independent diff run).
- When no Files section is present, fallback hint guides the reviewer to the spec.

These changes directly implement the Review Dispatch Budget HARD RULE already
documented in `.claude/loop/rules.md`.

## v0.5.0 — 2026-05-28 — enforce validation gate at slice close

### Behavior change (potentially breaking for downstream repos)

`/loop:slice complete` now refuses to roll the parent feature to
`done/` when no validation evidence is present for the slice. Mirrors
the existing blocked / simplify gates: the slice file still moves to
`completed/`, but the feature is held in `in-progress/` until the gate
is satisfied.

Motivation: the previous `/crew:build` and `/loop:slice complete`
workflows were instruction-only — they listed validation as a phase but
relied entirely on agent discipline to dispatch the validator and emit
the artifact. In practice this drifted (e.g. Astra.Humanizer shipped 34
slices with zero validation artifacts and no `validation_skipped`
badges). The gate makes the skip impossible without an explicit,
auditable bypass.

### Gate resolution order

1. Slice frontmatter `requires_validation: false` → waived.
2. Workflow-state `currentRun.gates.validation.status` ∈
   `{passed, skipped}` → satisfied.
3. Validation artifact under
   `.claude/artifacts/crew/validations/` whose filename references the
   slice id → satisfied with evidence list.
4. `slice complete --skip-validation-check "<reason>"` → writes a
   `validation_skipped` badge (audit trail) then bypasses.
5. Otherwise → feature held open with `reason: "validation-gate: ..."`.

### New surface

- `scripts/lib/validation-gate.mjs` — `deriveValidationGate(repoPath,
  sliceId, { sliceFm })`.
- `scripts/lib/slice-linker.mjs::completeSlice` — accepts
  `skipValidationCheck` option; result includes `validationGate` +
  `validationSkippedBadge`.
- `scripts/lib/slice-linker/crew-bridge.mjs::markValidationSkippedBadge`
  — invokes `crew mark-badge --badge validation_skipped --note <reason>`.
- `scripts/loop.mjs` — new `--skip-validation-check <reason>` flag on
  `slice complete`.
- `tests/validation-gate.test.mjs` — 8 unit tests for the helper.
- `tests/slice-complete.test.mjs` — 7 integration tests for gate
  scenarios.

### Migration

Repos that were silently skipping validation must do one of:

- Backfill validation artifacts for in-flight slices (`crew
  write-validation-result --repo <path>`).
- Set `validation_skipped` badges with reasons via `crew mark-badge`.
- Add `requires_validation: false` to doc-only slice frontmatter.
- Pass `--skip-validation-check "<reason>"` to `slice complete`
  invocations from automation.

## v0.4.1 — 2026-05-28 — fix: ship missing cache.mjs

### Fix
- `scripts/lib/cache.mjs` was referenced by `backlog-writer.mjs` but
  never committed in the v0.4.0 release, breaking every plugin install
  that pinned 0.4.0 (e.g. `backlog-writer.mjs:7` import of
  `./cache.mjs` resolved to a missing file).
- Adds the cache module + its test (`tests/cache.test.mjs`).
- Also ships the per-invocation cache wiring in `backlog-parser.mjs`,
  `grade-parser.mjs`, `paths.mjs`, and `spec-parser.mjs` that was
  missing from the 0.4.0 cut.

## v0.4.0 — 2026-05-27 — PM agent, performance optimization, grade naming, hooks

### PM agent (new)
- `pm-scorer.mjs` — 5-dimension scoring (customer_impact, effort_estimate,
  strategic_alignment, technical_risk, dependency_depth), composite priority
  derivation (P0–P3), autonomous_safe classification.
- `pm-artifact-writer.mjs` — writes PM review artifacts to
  `.claude/artifacts/loop/pm-reviews/`.
- PM agent prompt (`agents/pm.md`) + 3 skills (pm-triage, pm-review,
  pm-decompose). PM triage step inserted in Cross-Slice Continuation rule.
- Backlog parser/writer enhanced with PM review frontmatter support.

### Performance optimization
- **Model routing** — `model-router.mjs` resolves model per phase (sonnet
  default for build/validate, opus for review/design). Config in
  `loop.json` under `modelRouting`. Dispatch instruction includes
  `Preferred model:` hint.
- **Per-invocation cache** — `cache.mjs` with `cached(key, fn)` /
  `bust(key)` / `clearAll()`. Wired into `listBacklog`, `listGrades`,
  `locateSliceFile`. Cache busted on writes.
- **Token diet** — loop-rules.md compressed 184→152 lines, CLAUDE.md
  HARD RULES summary trimmed.
- **Dispatch discipline** — `dispatchLimits` config (max 4 subagents/slice,
  inline preference list). Dispatch budget rule in loop-rules.
- **Tool discipline** — tool failure prevention guidance (<2% target).

### Grade naming
- Grade files now follow artifact naming convention:
  `YYYYMMDDTHHMMSSZ-[phaseN-][featNNN-]sliceNN-grade.md`. Backward
  compatible — grade-parser discovers both old and new format.

### Plugin hooks
- Pre-push validation hook (`PreToolUse` on Bash) runs
  `validate-manifests.mjs` before `git push`.
- Repo-local reviewer guidance (`.claude/crew/reviewer.md`) invokes
  `plugin-dev:plugin-validator` and `plugin-dev:skill-reviewer` during
  crew reviews.

### Tech debt
- Consolidated `pathExists` (4 modules) and `ensureDir` (5 modules) into
  `paths.mjs`.
- Refactored `buildTokens` in loop-installer.mjs — cyclomatic complexity
  now under ESLint threshold (was 22, limit 15). Zero lint warnings.
- Artifact path migration: all loop artifacts under
  `.claude/artifacts/loop/`, single-source `paths.mjs`.
- `frontmatter.mjs` parseScalar now handles floats (was integers only).

### Other
- Phase prefix in artifact naming simplified (`phase3` not `phase-3`).
- 334 tests (up from 288). 0 lint warnings.

## v0.3.5 — 2026-05-24 — Propagate FEAT + phase to crew CLI flags + bump pin to v0.3.3

### crew-bridge — pass --feature / --phase to crew writers

- `writeCrewRunBrief` passes `--feature <id>` and `--phase <value>` to
  `crew write-run-brief` when the slice frontmatter sets them. Crew CLI
  embeds both in the run-brief artifact frontmatter (added in crew
  v0.3.3). Filename surface also stays tagged via the existing `--title`
  enrichment.
- `tryWriteCostReport` passes `--feature` / `--phase` to both
  `cost-slice` (cost-report frontmatter) and `cost-advise`. The
  cost-advise call also now passes `--title <enrichedTitle>` so the
  cost-advise filename matches the rest of the artifact surface
  (`<TS>-cost-advise-phase3-feat021-slice36.md`).
- `phase-gate.recordWithCrew` passes `--phase` when invoking
  `crew write-validation-result`. Validation-result frontmatter from
  phase-gate now records which phase ran.
- `reviewer-ladder.buildReviewLadder` prompt instructs dispatched
  reviewers to invoke `crew write-review-result` with `--feature` and
  `--phase` flags (in addition to the enriched `--title`). Both
  filename and frontmatter pick up the tags.

### Crew pin bump

- `MIN_CREW_VERSION` raised `0.3.0` → `0.3.3`. The new flags require
  hero-crew v0.3.3+. `README.md` install text updated.

## v0.3.4 — 2026-05-24 — Artifact naming, tight slugs, TS strip, crew pin bump

### Artifact filenames + frontmatter surface FEAT and phase

- Artifact filenames now include optional `[phase-N-][feat-NNN-]` slug
  segments between the artifact kind and the slice id. Segment order
  follows the standard wide→narrow decomposition hierarchy
  (phase → feature → slice). LoopObserver (and any consumer browsing
  `.claude/artifacts/crew/`) can see which phase and FEAT an artifact
  belongs to from the filename alone.
- Repo-owned artifact frontmatter (handoff + final-synthesis) gains a
  `phase: <string|null>` key alongside the existing `feature:` key.
- Slice frontmatter gains an optional `phase: <string|null>` field
  (default `null`). `sliceFromFeature` inherits `phase` from the parent
  feature when present.
- `scripts/lib/slice-linker.mjs::startSlice` reads slice frontmatter and
  passes `featureId` + `phase` into `writeCrewRunBrief`. `completeSlice`
  passes both into `writeCrewHandoff`, `writeCrewFinalSynthesis`, and
  `tryWriteCostReport`.
- `scripts/lib/reviewer-ladder.mjs` prepends `PHASE-N FEAT-NNN SLICE-NN:`
  to the suggested `--title` in dispatched reviewer prompts so reviewer
  output filenames carry the tags via crew's slugifier.

### Tight slug segments

- Filename segments compacted: `phase3-feat021-slice36` instead of
  `phase-3-feat-021-slice-36`. The joining dash sits between segments
  only; identifiers are compacted internally. Same compaction applies
  to crew-CLI `--title` args (`PHASE3 FEAT021 SLICE36`).
- Frontmatter `feature:` / `phase:` keys keep the standard human form
  (`FEAT-021`, `"3"`). Only filenames + crew-CLI title args are tight.

### Crew-CLI timestamp stripped

- New `scripts/lib/artifact-naming.mjs` exports `stripArtifactTimestamp`
  and `hasLeadingTimestamp`. Strips the leading `YYYYMMDDTHHMMSSZ-`
  prefix the crew CLI adds to artifact filenames and renames the file
  on disk. No-op when no TS prefix.
- `writeCrewRunBrief` post-renames the run-brief file returned by
  `crew write-run-brief`. Same for `tryWriteCostReport` (cost-report +
  cost-advise).
- `linkArtifactToSlice` auto-strips the TS prefix before recording the
  linked path in slice frontmatter. Covers agent-invoked
  `crew write-review-result` / `crew write-validation-result` via the
  `/loop:slice link` flow.
- `phase-gate.mjs::writeReport` drops the timestamp from the loop-owned
  filename: `phase<N>-gate.md` instead of `phase-<N>-gate-<TS>.md`.
- `phase-gate.mjs::recordWithCrew` captures the crew CLI stdout JSON and
  strips the TS from the crew-written validation-result path.

### Filename format reference

- Repo-owned: `[phase-N-][feat-NNN-]<slice-NN>-<kind>.md` (no timestamp).
- Crew-owned (after post-rename):
  `[phase-N-][feat-NNN-]<slice-NN>-<kind>[-summary].md`. Loop strips
  the leading timestamp; remaining segments come from crew's slugifier.
- Optional segments drop out when their source field is null;
  existing artifacts on disk are not rewritten.

### Crew pin bump

- `MIN_CREW_VERSION` raised from `0.1.12` → `0.3.0`. Rebrand cutoff
  (crew renamed marketplace + plugin in 0.3.x). `README.md` install
  text and crew version reference updated. Consumers still on crew
  `0.1.x` must upgrade.

### Refactor + tests

- `scripts/lib/slice-linker.mjs::startSlice` complexity dropped 16 →
  ≤15 via `resolvePlanAndTitle` and `buildStartSliceReturn` helper
  extractions. No behavior change. Eslint output is now warning-free.
- `tests/artifact-naming.test.mjs` — slug + title helper coverage,
  including TS-strip rename, no-op, falsy input cases.
- `tests/synergy.test.mjs` — `completeSlice` filename + frontmatter
  assertions for slices with / without `phase`.
- `tests/reviewer-ladder.test.mjs` — dispatched-prompt `--title`
  coverage for PHASE+FEAT, FEAT-only, bare slice.
- `tests/integrations.test.mjs` — `linkArtifactToSlice` TS-strip
  rename-on-disk assertion.
- `tests/phase-gate.test.mjs` — `phase<N>-gate.md` basename assertion.

### Notes

- LoopObserver and other consumers should update their filename regex
  to allow the optional `feat-NNN` and `phase-N` segments. The slice
  id position remains canonical.
- `cost-advise` filename enrichment is out of scope until the bridge
  call site grows a `--title` argument.

## v0.3.3 — 2026-05-24 — Marathon mode + deterministic FEAT pickup

### Picker — deterministic tiebreaker on priority ties

- Fixed autonomous-loop stall when batch-triaged FEATs all share the same
  priority (e.g. all P2). Previous rule "break ties by most recently
  triaged" collapsed to itself because batch triage stamps every feature
  with the same `updated` date.
- New tiebreaker: **lowest FEAT-NNN id ascending** (oldest feature wins).
  Deterministic, independent of frontmatter timestamps, derivable from
  filename alone.
- New comparator `comparePickOrder(a, b)` exported from
  `scripts/lib/backlog-parser.mjs`. Used by `brief.mjs` (`topTriaged`)
  and `memory-snapshot.mjs` (`triagedTop`). Rule text in
  `templates/loop-rules.md` updated to match.
- New tests in `tests/backlog.test.mjs` (comparator unit tests with
  shuffled input + missing-priority case) and `tests/brief.test.mjs`
  (integration tie test).

### Stop conditions — marathon mode

- New config key `loop.marathonMode` in `.claude/loop.json`. Default
  `true` on all four shipped presets (`dotnet-aspire-python`,
  `dotnet-react`, `dotnet-vue`, `python-only`). Hand-rolled configs
  without the key also default to marathon behavior.
- Under `marathonMode: true`, the autonomous loop walks the entire
  backlog. The five previous gating triggers reduce to four:
  - Backlog exhausted (no pending/triaged/in-progress FEATs + no
    approved-undecomposed SPECs) — **halt**.
  - Crew `escalated_to_human` — **halt**.
  - Warn-severity pattern alerts (score-trend regression, in-progress
    orphan, decomposition explosion) — **halt**.
  - High-severity cost alerts across last 3 slices — **halt**.
  - Iteration cap (default 25) — **advisory only** (counter still
    increments; snapshot still reports `iterationCount`/`iterationCap`).
  - Crew soft `blocked` badge — **advisory only** (snapshot still
    reports `crewBlocked`; the badge usually self-clears next
    iteration). Hard `escalated_to_human` still halts.
- Set `loop.marathonMode: false` to restore legacy five-condition
  gating (iteration cap + soft blocked badge re-enabled as hard stops).
- Snapshot gains a `marathonMode: boolean` field for dashboards.
- HARD RULE templates (`templates/claude-md-hard-rules.md`,
  `templates/loop-rules.md`, `templates/stop-conditions.md`),
  `commands/stop-check.md`, and `skills/loop-discipline/SKILL.md`
  updated to describe marathon vs. legacy gating.
- New `tests/marathon-mode.test.mjs` covers both modes. Existing
  `tests/crew-blocking-gates.test.mjs` and
  `tests/loop-iteration.test.mjs` gated-stop assertions now opt into
  legacy mode explicitly via `marathonMode: false`.

### Notes

- Motivation: the documented HARD RULE block says the loop "runs until
  PASS" and walks the entire backlog. The iteration cap and soft
  `blocked` badge fired premature stops mid-backlog with no safety win
  on well-shaped repos. Marathon mode aligns code with documentation
  without disabling the genuine external-block signals (escalation,
  cost spiral, warn alerts, true backlog exhaustion).

## v0.3.2 — 2026-05-24 — Multi-slice support (FEAT-020)

### Slice complete — multi-slice support (FEAT-020)

- `loop:slice-complete` no longer auto-moves the parent feature to
  `backlog/done/` when the feature opts out. Two opt-out paths:
  - **Frontmatter** — set `feature_complete: false` in the feature's
    YAML frontmatter. Loop respects this for every slice-complete call
    against any of the feature's slices. Set back to `true` (or remove)
    when ready to ship.
  - **Runtime** — pass `--keep-feature-open` to
    `/loop:slice-complete --id SLICE-NN --keep-feature-open`. One-off
    override; does not edit frontmatter.
- Default behavior unchanged: features without `feature_complete` set
  (or with `feature_complete: true`) auto-move to `done/` when the
  slices array is satisfied. Backwards-compatible.
- Result object gains `feature.keptOpen: true` + `feature.reason: string`
  when the move was skipped. Empty `feature.to` when kept open.
- New tests in `tests/slice-complete.test.mjs` cover all three states:
  frontmatter opt-out, runtime flag opt-out, explicit `true` passes-through.

### Notes

- Addresses the FEAT-019 SLICE-B auto-close gotcha discovered in
  hero-crew SLICE-01 close: features with body-planned multi-slice
  decomposition were prematurely moved to `done/` when only the first
  registered slice closed.

## v0.3.1 — 2026-05-23 — Author rebrand

### Marketplace

- Author rebrand consolidated to `astra` across `marketplace.json` and
  `plugin.json` (parent `astra` marketplace pin moves to `loop@0.3.1`).

### Notes

- No consumer-repo migration required. No code or skill changes.

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
    - `bestEffort` (three concurrent crew-bridge calls).
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
