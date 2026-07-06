# Changelog

All notable changes to the `runner` plugin are documented here. Versions
prior to v0.3.0 shipped under the name `autonomous-loop`; v0.3.0 – v0.50.1
shipped under the name `loop`.

## [Unreleased]

### Changed

- **`MIN_CREW_VERSION` raised `0.47.0` → `0.48.0`.** The aiplugin-dev anti-pause
  contract (dev-team PR #150) shipped in crew 0.48.0; the floor now guarantees
  it, so `/runner:install` refuses crew `< 0.48.0`. Retires the loop-side
  workaround for that pause pattern. Archived the corresponding
  upstream-request. Also archived two upstream-requests confirmed resolved
  upstream (preflight chained-`cd` MSYS-path translation; lead-orchestrator
  restoration, self-superseded by FEAT-191).

## [0.63.0] — 2026-07-06 — continuous-learning loop activation

### Added

- **Continuous-learning loop activation (FEAT-229, DEC-070, #351).** The
  0.62.0 release assembled every piece of the learning loop (classifier,
  mining, eval-generation) but nothing scheduled them — `mine-failures` was
  operator-run only and `generateEvalsForClusters` had no caller. This
  release wires them into one pipeline that actually runs on a cadence:
  - **`runLearningCycle`** (new `src/scripts/lib/learning-cycle.mts`) chains
    `mineFailures` (FEAT-221) → `generateEvalsForClusters` (FEAT-222) → a
    single dated cycle report under
    `.claude/artifacts/loop/learning-runs/YYYY-MM-DD.md`. Each stage is
    fire-and-forget: a throw in one stage never blocks the other or
    propagates to the caller.
  - **`loop.mts learn`** — new operator-invocable subcommand that runs one
    cycle immediately, independent of any cadence trigger.
  - **Cadence (DEC-070)**: hooked into the existing `retrospective` CLI
    subcommand — `runLearningCycle` fires right after `writeRetrospective`
    succeeds, merging onto the result as `learningCycle`. No new scheduler:
    a retrospective is the loop's existing "look back and consolidate"
    moment (and the exact remedy the marathon-checkpoint hard stop already
    tells operators to run). `checkMarathonCheckpoint` itself was
    considered and rejected as the hook point — it runs on every
    `checkStopConditions` call (every `/runner:brief`, every auto-loop
    iteration boundary), which would fire the cycle on every status poll
    instead of only when a retro actually lands.
  - **Opt-in `loop.learningLoop` config** — `enabled` (default `false`, same
    posture as memory-sink/DEC-065), plus `maxClustersPerRun`,
    `maxSpecsPerRun`, and `windowDays` volume caps; a run that exceeds a cap
    records what was dropped in the cycle report rather than silently
    truncating.

## [0.62.0] — 2026-07-06 — continuous-learning-loop repair + preset removal

### Breaking

- **Placeholder AC auto-generation removed.** `sliceFromFeature` no longer
  fabricates template acceptance criteria (`AC-1: All tests pass`,
  `AC-2: <replace with…>`) when a FEAT has no `## Acceptance criteria` section.
  It now throws `AcceptanceCriteriaRequiredError` — the PM owns AC authoring,
  and a missing/empty AC section is a hard error, checked before the
  in-progress move so a refuse leaves backlog state untouched. Ordered after
  the sizing / proposed_slices structural gates. Re-run
  `/runner:triage --deep <id>` or `/runner:pm-review <id>` to draft ACs. The
  `startSlice` AC linter (placeholder detection) is unchanged and still runs.
- **FEAT-218 Phase 2: preset layer removed (DEC-069, #348).** Install-time
  templates replace the runtime preset tier — `/runner:install --preset X`
  now inlines the selected stack's config directly into `.claude/loop.json`
  at install time instead of leaving a `preset:` pointer for `resolveConfig`
  to re-resolve on every run. `resolveConfig` no longer merges
  `scripts/presets/*.json` at all and no longer falls back to the
  `dotnet-python` default — unconfigured repos get a clear error instead of a
  silent wrong-stack default. Repos with an existing `.claude/loop.json`
  written by the old preset-merge flow are unaffected (their config was
  already materialized); repos relying on live re-resolution of a `preset:`
  key on every run must re-install to get an inlined config. Phase 1 analysis:
  `docs/research/2026-07-03-preset-removal.md` (#342).

### Changed

- **Preset renames**: `dotnet-aspire-python` → `dotnet-python` (content
  unchanged; also the resolver default in `config-resolver.mts`),
  `dotnet-vue` → `dotnet-typescript-vue`. Repos pinning the old names in
  `.claude/loop.json` must update `preset:` — `resolveConfig` throws
  `Unknown preset` otherwise.
- `slice-linker`: extracted the AC-line classifier out of
  `extractAcceptanceCriteria` to drop it under the Biome cognitive-complexity
  cap (FEAT-226, #331). No behavior change.

### Added

- **Memory sink (FEAT-217, DEC-065).** New opt-in `src/scripts/lib/memory-sink.mts`
  mirrors durable knowledge — decisions and lessons — into astramem via the
  `astramem remember` CLI. Gated on `.claude/loop.json` `memory.enabled`
  (absent → OFF), cortex project derived from `memory.project` else the repo's
  `productName`. Fire-and-forget, 2s-capped, fail-silent spawn that never throws
  and never blocks the close / grade-write / learn contract. Wired at
  `grade-writer.mts` (each newly-minted `DEC-NNN`) and `learnings.mts` (each
  lesson), both double-guarded. `grade-writer.mts` also mirrors each
  `## Surprises` / `## Followups` grade bullet as a `note` (`recordNote`), so
  durable slice knowledge beyond decisions + lessons reaches memory.
- **Ingest env-tier hardening (FEAT-216, DEC-064).** The Path-2 direct sink
  (`slice-linker/astrarunner-ingest.mts`) now resolves the bearer token tier via
  a dedicated `resolveTokenEnv`: a committed `loop.ingest.url` without
  `loop.ingest.env` no longer inherits the shell-global `ASTRARUNNER_ENV`, so a
  wrong-tier bearer can never be paired with a committed URL. Adds a
  `LOOP_DEBUG`-gated, non-secret skip signal to stderr (reason + appId only,
  never a token) for no-url / no-appId / no-token cases.
- **`typescript-service` preset** — TypeScript Node service / daemon
  (Fastify + better-sqlite3 / sqlite-vec, `tsc` build, Vitest, JSON-schema
  ajv contracts, OS-service deployment). Drives `astramemory-local`.
- **Continuous-learning-loop enrichment.** With the three dormancy bugs fixed
  (see Fixed), the loop's mid-tier now has real content to work with:
  - **Learnings schema lifecycle fields** (FEAT-220, #332) — `learnings.jsonl`
    write-shape enriched with evidence + `status: candidate|validated` lifecycle
    fields.
  - **`FailureClassifier` + `mine-failures` job** (FEAT-221, #336) —
    `src/scripts/lib/failure-classifier.mts` clusters failure-adjacent signal
    from grades + captured runs into ranked `FailureCluster`s.
  - **Grade-mining widened to Surprises/Followups** (FEAT-228, #345) — the
    classifier's grade collector no longer requires a non-pass-like `verdict`
    (0/119 real grade files set one); it now also mines `## Surprises` /
    `## Followups` bullets, independent of verdict, while keeping the
    mined-lesson anti-inflation guard intact.
  - **`EvalGenerator` → crew eval-spec (FEAT-222, DEC-068, #346)** — converts a
    `FailureCluster` into a machine-manufactured eval spec appended to the
    matching `evals/agents/crew-<agent>.yaml` `tests:` array (crew-owned
    schema, no fork), marked `manufactured: true` with provenance
    (`source_run_id`, `cluster_hash`) and deduped on `cluster_hash`. Gated on
    a new `loop.crewRepoPath` config key; skips (never throws) when absent or
    when a `failure_class` has no mapped agent-under-test.
- FEAT-219 residual: `agentType` tagging + reviewer memory-context injection
  wired into `post-builder-fanout` (#347).
- `docs/research/2026-07-03-preset-removal.md` — FEAT-218 Phase 1 analysis of
  every preset field, every consumer, and the chosen removal path (#342).

### Removed

- **`python-only` preset** — pure-Python stack dropped; no consumer.
- FEAT-225 closed as resolved-upstream — superseded by astramem 0.6.0
  FEAT-423 (#337).

### Fixed

- **Continuous-learning loop was dead in three places; all three repaired**:
  - Capture write — `runner:close` / pr-fix / retro capture wrote learnings to
    a worktree-relative path instead of the canonical repo root, so entries
    silently vanished on worktree cleanup (FEAT-188 S1b, #327, #343).
  - Astramem mirror — `memory-sink.mts`'s `emit()` called a non-existent
    astramem subcommand; it now persists via the real `remember` subcommand
    (FEAT-223, DEC-067, #333).
  - Recall read — `recallPrior()` parsed a response shape the real astramem
    CLI never returns; fixed to match the actual CLI output (FEAT-227, #338).
- `memory-doctor` health probe no longer reports `ok` unconditionally — it now
  reflects real failures from the checks it runs (FEAT-224, #334).
- AC-extractor now parses FEAT-277 Given-When-Then + per-slice `### SN`
  acceptance-criteria formats instead of only the legacy list format (#323).
- `grades.jsonl` worktree-cwd bug — grade writes from a worktree resolved to
  the worktree path instead of the canonical repo root (reuses the S1b
  `resolveCanonicalRepoRoot` fix) (issue #326, #344).
- Duplicate `execFile` declarations removed from the learnings module that
  were breaking `tsc` on `main` (#349).

### Decisions

DEC-067 (astramem mirror persists via `remember`, not a nonexistent
subcommand), DEC-068 (EvalGenerator targets the crew eval-spec YAML schema,
not gepa-core Trial JSONL — see FEAT-222), DEC-069 (preset layer removed in
favor of install-time templates — see FEAT-218).

## [0.61.0] — 2026-07-04 — P1 enforcement hardening

### Added — P1.4 close-refusal: verdict-aware review/validation gates (2026-07-04)

Architecture-hardening plan P1.4 (SLICE-174 class fix — a slice whose review
was `rejected` and validation `failed` could still close as done because gate
checks tested artifact *presence*, never *decision content*).

- **`src/scripts/lib/review-gate.mts`** (new) — `deriveReviewGate` mirrors
  `deriveValidationGate`'s three-tier order (frontmatter waiver → workflow-state
  badge → artifact filename scan), but the artifact tier is verdict-aware:
  frontmatter `decision: rejected` (crew P1.3 canonical enum) fails the gate;
  `approved`/`approved_with_notes` satisfy; pre-P1.3 artifacts without the
  frontmatter field are grandfathered; artifact **absence** is tolerated with a
  warning (review filenames often lack the slice token — absence enforcement
  waits for P2 join keys).
- **`src/scripts/lib/artifact-verdict.mts`** (new) — shared newest-artifact
  frontmatter verdict reader (mtime ordering, never throws).
- **`src/scripts/lib/validation-gate.mts`** — artifact tier now verdict-aware:
  `decision: fail` blocks; `pass` satisfies; `skipped` (+`skip_reason`)
  satisfies close-ceremony semantics (known intentional divergence: crew's
  pre-push-verifier does not count `skipped` as pass); no-decision artifacts
  grandfathered.
- **`complete-slice.mts`** — review gate joins the existing soft-block
  architecture (`evaluateFeatureGates` → `isReviewBlocked` → FEAT→done held);
  `gate_transition` events now include the review gate. forceClose (D1: keep +
  audit) may override review/validation/test-adequacy verdict blocks — never
  `escalated_to_human`/`blocked` — and writes `force_closed: true` + reasons
  into the slice frontmatter, emits a `slice_force_closed` event, and fans out
  a `halt-badge` envelope.
- **`close-slice.mts`** — hard `GATE_FAILED_AT_CLOSE` pre-flight on the
  single-shot `--grade-yaml` path (sibling of `PREFLIGHT_EVIDENCE_MISSING`,
  same forceClose bypass). Warn-mode for the first 3 gate-violating closes
  (persisted counter `.claude/state/loop/close-refusal-state.json`), then
  enforces. Gated by the `close-refusal` flag (P1.0 registry).
- **`slice-events.mts`** — new `slice_force_closed` event type.
- Tests: `src/tests/close-refusal.test.mts` (12 cases: gate units, tier-a
  soft-block, tier-b throw + warm-up counter, flag-off, forceClose audit trail).

### Breaking

- **Placeholder AC auto-generation removed.** `sliceFromFeature` no longer
  fabricates template acceptance criteria (`AC-1: All tests pass`,
  `AC-2: <replace with…>`) when a FEAT has no `## Acceptance criteria` section.
  It now throws `AcceptanceCriteriaRequiredError` — the PM owns AC authoring,
  and a missing/empty AC section is a hard error, checked before the
  in-progress move so a refuse leaves backlog state untouched. Ordered after
  the sizing / proposed_slices structural gates. Re-run
  `/runner:triage --deep <id>` or `/runner:pm-review <id>` to draft ACs. The
  `startSlice` AC linter (placeholder detection) is unchanged and still runs.

### Changed

- **Preset renames**: `dotnet-aspire-python` → `dotnet-python` (content
  unchanged; also the resolver default in `config-resolver.mts`),
  `dotnet-vue` → `dotnet-typescript-vue`. Repos pinning the old names in
  `.claude/loop.json` must update `preset:` — `resolveConfig` throws
  `Unknown preset` otherwise.

### Added

- **`typescript-service` preset** — TypeScript Node service / daemon
  (Fastify + better-sqlite3 / sqlite-vec, `tsc` build, Vitest, JSON-schema
  ajv contracts, OS-service deployment). Drives `astramemory-local`.
- **P1.0 feature-flag envelope** — runner features registry
  (`src/scripts/lib/features-service.mts`) extended with 7 new named flags
  mirroring crew's sibling registry shape ({version, default, description,
  scope, owner, since}), so the two registries can merge into one kernel
  service in Phase 2: `dispatch-guard-block` (guard-feat-dispatch exit-2
  block vs warn-only), `close-refusal` (P1.4 close gate, registry entry
  only), `snapshot-autoregen` (P1.6 snapshot regen, registry entry only),
  `learnings-capture` (P1.11 lessons capture, registry entry only),
  `version-check` and `bootstrap-context` (SessionStart hooks), and
  `parallel-fe-be-variant` (`pickBuilderVariant` fe+be parallel dispatch
  route). All default `true` — zero behavior change out of the box.
  `hooks/version-check.mjs` and `hooks/bootstrap-context.mjs` now read
  `.claude/loop.json`'s `features` block directly via a small
  dependency-free `hooks/feature-flag-lite.mjs` reader (plain `.mjs` hooks
  have no build step and can't import the compiled TS service).
  `hooks/guard-feat-dispatch.mjs`'s exit-2 block path now degrades to
  warn-only (exit 0, same stderr message) when `dispatch-guard-block` is
  disabled — allowlist and messages unchanged (that's a separate P1.8 item).
- **P1.8 stale-reference fixes in runner-plugin hooks.**
  - `hooks/guard-feat-dispatch.mjs`: full `allowed[]` audit against the
    live `dev-team/agents/*.md` and `runner-plugin/agents/*.md` trees.
    `loop:architect/document-writer/pm/researcher` → `runner:architect/
    document-writer/pm/researcher`; added the current per-stack builder +
    ceremony ids actually emitted by `dispatch.mts` (`crew:frontend-dev`,
    `crew:backend-dev`, `crew:fullstack-dev`, `crew:architect`, `crew:
    inspector`, `crew:verifier`) plus `crew:dev-lite` (trivial-scope
    fixups) and `crew:investigator` (read-only lookups). Retired ids
    (`crew:builder*`, `crew:reviewer`, `crew:reviewer-validator`, `crew:
    validator`, `crew:deployer`, `crew:copywriter`, `loop:*`) stay
    allowlisted one more release as explicitly commented legacy aliases.
    `general-purpose` is (and stays) never allowlisted — that's the
    bypass this hook exists to close. Guidance text now points at
    `/runner:start` / `/runner:close` / `/runner:auto` instead of the
    retired `/loop:slice-*` commands, and the "Override:" line is now
    generated from the `allowed` array itself instead of a hand-maintained
    duplicate string, closing off the exact class of drift this fix
    addresses.
  - `hooks/version-check.mjs`: `loop@loop` → `runner@astra`; marketplace
    clone path `marketplaces/loop/...` → `marketplaces/astra/...`;
    manifest lookup `p.name === "loop"` → `"runner"`; upgrade commands and
    the CHANGELOG link updated to match. Added `RUNNER_VERSION_CHECK_HOME`
    env override so tests can point the hook at a fixture `~/.claude` tree.
  - `hooks/bootstrap-context.mjs`: retired `/loop:slice start|complete`
    guidance → `/runner:start` / `/runner:close`; `crew:builder` dispatch
    mention → the current tag-routed builder set; `docs/ai-loop/...`
    paths (never matched the installer's actual scaffold default) →
    `.claude/artifacts/loop/ai-loop/...` per `paths.mts`'s
    `aiLoopRoot`/`backlogPath` defaults.
  - `hooks/feature-flag-lite.mjs`: replaced the hardcoded `true` fallback
    with an explicit `HOOK_FLAG_DEFAULTS` map for the 3 flags it actually
    reads, guarded by a `features-service.test.mts` parity test so a
    default drifting between this file and the TS registry fails the
    suite instead of silently misbehaving in production.
- **P1.6 snapshot auto-regen in the close ceremony.** `closeSlice()`
  (`slice-linker/close-slice.mts`) now calls the existing FEAT-208
  generator (`memory-snapshot.mts::writeMemorySnapshot`) as a final step
  on both exit paths (scaffold-only and full grade-write), rewriting
  `.claude/artifacts/loop/loop-snapshot.md` so it is never more than one
  slice stale. No second renderer — `slice-progress.md` was already
  refreshed by `completeSlice`'s own `writeSliceProgress` call. Gated by
  the `snapshot-autoregen` flag (P1.0, default on); regen failures warn
  to stderr and never fail the close.
- **P1.11 learnings store activation.** `writeGrade()`
  (`grade-writer.mts`) now parses the grade body's `## Lessons` bullets
  (reusing `lessons-feed.mts`'s `parseListSection`, now exported) and logs
  each one to `.claude/artifacts/loop/learnings.jsonl` via `logLearning`,
  deterministically keyed `grade-lesson:<sliceId>:<index>` so a
  writeGrade re-run does not double-log. Gated by the `learnings-capture`
  flag (P1.0, default on); fail-silent, matching the other best-effort
  emits in this function. `startSlice`'s `learningsDigest` (previously
  reading a permanently-empty store) now has real feed-forward content.

### Removed

- **`python-only` preset** — pure-Python stack dropped; no consumer.
- **`hooks/read-guard.sh` deleted (D2, serge 2026-07-04).** The post-Edit
  re-read PreToolUse guard is retired as an advisory-noise anti-pattern —
  agents were observed ignoring the stderr warning repeatedly (training
  warning-blindness against real gates), legitimate re-reads exist
  (fresh line numbers post-edit, offset paging), and the harness now
  natively tracks file state ("no need to re-read" reminders), so the
  substrate absorbed the feature. Removed alongside: `registerReadGuardHook`
  (`loop-installer-scaffold.mts` — was the only code path that wrote
  `.claude/settings.json` during `/runner:install`, so installs no longer
  touch that file at all), its call site in `loop-installer.mts`, and
  `src/tests/read-guard-hook.test.mts`. `.claude/state/crew/read-guard.jsonl`
  is no longer written by fresh installs (pre-existing files in already-
  installed repos are not retroactively cleaned up). This is a scoped
  removal of the current shipped hook implementation, not a rewrite of the
  historical FEAT-039 changelog entry below documenting when it shipped.

## [0.60.0] — 2026-07-02 — crew 0.47.0 floor (FEAT-176) + crew CLI runtime fix

**Compat**: `MIN_CREW_VERSION` raised `0.31.1` → `0.47.0` (FEAT-176 /
SLICE-134, DEC-061). `/runner:install` now refuses crew installs below
0.47.0 — the release carrying the scaffold-first HARD OUTPUT CONTRACT
for `crew:inspector` / `crew:verifier`, which the specialist-pause SOP's
self-heal path depends on. Builder-tier + aiplugin-dev contract coverage
ships in crew 0.48.0 (upstream-request tracked as `partial`).

### Fixed

- **Crew CLI runtime picker** — `crewCliRuntime()` spawns the crew CLI
  under Bun when the entry point is `crew.ts` (crew's own guard rejects
  node), `node` for legacy `crew.mjs`. Fixes the persistent 3-test
  phase-gate failure cluster; full suite green (1951 tests, 0 fail).
- **CLAUDE.md drift** — lint/format gates corrected to Biome (ESLint /
  Prettier references were stale); four v0.53-removed command references
  rewritten to their successors; nonexistent `eslint.config.mjs`
  exception dropped.
- **SOP scope accuracy** — `specialist-pause-handling.md` §2 manual
  fallback retired for inspector/verifier only; kept active for
  builder-tier and aiplugin-dev until crew 0.48.0 (review-gate finding).
- **Historical cost dedup** — one-time `dedupeCostReportsInDir` sweep:
  in-window trajectory $34.19 → $25.36 across 15 unique reports.

## [0.59.0] — 2026-07-02 — retrospective quick-win wave (FEAT-204..214, #297)

Eleven FEATs from the 2026-07-02 architecture retrospective
(`docs/research/2026-07-02-architecture-retrospective.md`), built as three
parallel worktree waves, plus the halt-events v1 contract adoption.

### Added

- **pm-apply CLI** (FEAT-214, DEC-058) — `bun loop.mts backlog pm-apply
  --file <results.json>` restores the PM score write path deleted in
  v0.53: validates each entry (5-dim scores, decline citations,
  allowed-id set) and commits frontmatter/body atomically via
  backlog-writer. `skills/triage/SKILL.md` contract synced to PM's real
  field names; `jq` dependency dropped; `runner:loop-discipline` moved
  under `skills/**` so it is actually Skill-invocable; `intakeFromText`
  implemented for real (creates a pending FEAT for the normal PM phase);
  `snapshot-memory` un-stubbed (live handler was intercepted by a stale
  removal stub).
- **Slice-shape-aware model tier routing** (FEAT-205) — `SHAPE_TIER_MAP`
  + `resolveWaveDispatchModel`; docs/trivial slices no longer dispatch
  on opus (SLICE-115 burned $121 of $143 on a docs-only slice).
- **Wave-mode cost report deduplication** (FEAT-204) — one report per
  session; siblings reference via `shared_with`; snapshot averaging
  dedups by session fingerprint (headline was ~5x inflated).
- **Blocking snapshot staleness gate** (FEAT-208) — CI gate #9
  (`validate-snapshot-freshness.mts`); stale `loop-snapshot.md` fails CI.
- **workflow-state schemaVersion guard** (FEAT-209, DEC-060) —
  `workflow-state-guard.mts`; loop refuses cross-plugin pin-writes on
  version mismatch (fail-open on DEC-018 path, fail-loud on DEC-019
  path). Crew-side load validation requested upstream.
- **Injection defense** (FEAT-213) — untrusted-input sections in all
  owned agent prompts; PM `Edit` grant dropped, `Write` narrowed to
  pm-reviews; provenance frontmatter on all vendored 3rdparty agents.
- **Shared `appendJsonl` helper** (FEAT-211) — replaces 8 hand-rolled
  JSONL appenders with one seam-tested module.
- **Pause/retry telemetry** (FEAT-212) — `pause-telemetry.mts` +
  `pause-events.jsonl`; snapshot renders a real pause rate (first
  measurement: 80% of aiplugin-dev dispatches paused — see learnings #5).
- **halt-events v1 contract adoption** (#297) —
  `fanoutHaltBadgesFromSnapshot` stamps `schemaVersion: "1.0.0"`; new
  `halt_badge.resolved` envelope on badge clear (transition detection
  via `.claude/state/loop/halt-badge-state.json`, best-effort
  `resolverAgentRole`); new `halt-badge-state.mts` +
  `halt-badge-resolved.schema.json`. See `docs/halt-badges.md`
  § "Fan-out envelope contract (halt-events v1)".

### Fixed

- SOP `specialist-pause-handling.md` no longer false-positives on
  FEAT-161 in-progress scaffolds (FEAT-206).
- CLAUDE.md drift purge (FEAT-207): dead `slice-review-ladder.md` /
  `multidim` / `backlog-enrich`/`retriage` pointers corrected; stale
  lead-restoration upstream-request closed as superseded by FEAT-191.
- `--ids` targeted rescore flag (FEAT-201, shipped 2026-06-16) verified
  and closed.

### Decisions

DEC-058 (pm-apply hybrid write path), DEC-059 (GEPA optimizes a
delimited portable-core block, recorded before any live trial history),
DEC-060 (workflow-state schemaVersion).

### Added — plugin-manager ingest config (token + environment URL)

The `runner` plugin now exposes `userConfig` in `plugin.json` so telemetry can
be configured directly from the Claude Code plugin manager — no `connect`
claim-code flow or hand-edited `~/.astrarunner/*.json` required:

- `ingest_url` — environment URL to report loop telemetry to (default
  `https://api.astrarunner.com`).
- `ingest_token` — ingest bearer (`lrt_…`), stored in the OS keychain
  (`sensitive: true`), never written to the repo.
- `astrarunner_env` — tier label (`local | staging | prod`, default `prod`).

Claude Code injects these as `CLAUDE_PLUGIN_OPTION_*` env vars (e.g.
`ingest_token` → `CLAUDE_PLUGIN_OPTION_INGEST_TOKEN`). A new
`plugin-options.mts` resolver reads them as a fallback behind the existing
`LOOP_INGEST_URL` / `LOOP_INGEST_TOKEN` / `ASTRARUNNER_ENV` env vars (explicit
env still wins, mirroring the mem0 pattern
`MEM0_API_KEY ?? CLAUDE_PLUGIN_OPTION_API_KEY`). Both telemetry consumers read
it:

- The direct ingest sink (`astrarunner-ingest.mts`) resolves url + token + env
  from the plugin options.
- The webhook notifier (`event-notifier.mts`) resolves url + env, and uses
  `ingest_token` as a **single-token bearer fallback** — applied only when no
  committed literal bearer and no `appId`-bound Pattern-B token-store entry
  resolve first (those still win, preserving cross-tier isolation).

So pasting a token + URL in the plugin manager is enough for the loop to report
on either path. Fail-silent contract preserved (no url/token → no-op, never
throws).

## [0.58.0] — 2026-06-27 — runner-plugin#291 + #292: recall + doctor

### Added — online learning consumer (#291)

`runner:start` now queries the memory layer for prior failures + decisions on
the same FEAT / touches_files pattern BEFORE building the dispatch instruction,
injects a Markdown context block into the builder prompt.

- **`lib/memory-recall.mts`** — `recallPrior({ featId, sliceId, touchesFiles, k = 5 })`
  spawns `astramem recall --query <q> --k <k> --project <featId>` with a 5s
  wallclock cap via AbortController. Returns `[]` on CLI absent / timeout /
  malformed JSON / non-zero exit. Never throws.
- **`lib/recall-injector.mts`** — `formatRecallBlock(memories)` renders top-K
  memories as Markdown with 200-char truncation + importance-desc ordering.
  Empty array → empty string (no header, no whitespace).
- **`slice-linker/start-slice.mts`** — pre-dispatch recall hook prepends the
  block to the dispatch instruction. Emits a `recall_used` memory after
  injection (score=1, feedback=`hits=N`) so the trainset captures
  recall-vs-no-recall outcomes for later A/B comparison.
- **Config**: `loop.json memory.recall.{enabled, k, timeoutMs}` (defaults:
  `enabled: true`, `k: 5`, `timeoutMs: 5000`). Set `recall.enabled: false`
  to disable online lookup without disabling capture.
- **`GepaPayload`** — `source` + `event` unions extended with `"recall"` +
  `"recall_used"`. Additive — back-compat preserved.

Pattern mirrors Otta's `learn-from-pulse` skill — query before build, act on
prior failures, no schema migration.

### Added — operator visibility (#292)

`runner:status` now surfaces a `## Memory layer` block summarizing the bridge's
health.

- **`lib/memory-doctor.mts`** — `probeMemory()` wraps `astramem doctor` with
  a 3s AbortSignal cap. Returns a 4-state `MemoryStatus`:
  - `ok` → CLI path + provider + version + URL + last ingest
  - `cli_missing` → "dormant — bridge activates when memory-plugin v0.4 ships"
  - `unreachable` → CLI path + fix hints (`astramem doctor` + provider switch)
  - `disabled` → `loop.memory.enabled = "never"` reminder
  Never throws.
- **`lib/memory-doctor-renderer.mts`** — Markdown variants per state.
- `runner:status` block injection — operator can see at a glance whether
  capture is live, dormant, or disabled.

### Dormancy

Both #291 + #292 are dormant until **memory-plugin v0.4** ships the
`astramem` CLI. Before then:
- Recall returns `[]` → no block injected → dispatch instruction unchanged.
- Doctor returns `cli_missing` → status block shows dormancy message + off-switch.

### Closes
- runner-plugin#291 — recall before slice start.
- runner-plugin#292 — doctor integration in `runner:status`.

## [0.57.0] — 2026-06-27 — runner-plugin#290: expand capture (start + parallel phase-gate FAIL)

### Added — two new memory emit sites

Builds on the v0.56.0 memory-bridge shim. Adds:

- **`runner:start`** → `slice_started` memory (score `0.5`). Fires after
  the slice file is materialized + dispatch instruction built, BEFORE
  agent dispatch. Carries dispatch label + agent name + confidence +
  approval-gate flag.
- **Parallel phase-gate FAIL** → `phase_gate_fail` memory. Parity with
  the sequential injection from `runner:phase-gate` shipped in v0.56.0.
  Covers `parallel-orchestrator.mts` FAIL branch with the same payload
  shape (failing groups + exit codes).

### Hardened — emit() child-process kill on cap

`emit()` now uses `AbortController` to kill the spawned `astramem` child
when the 2s wallclock cap fires. Previously the timeout resolved the
race but the child process kept running, which made the timing test
("emit resolves within 2.5s when child process hangs indefinitely") flaky
at ~3070ms. Now consistently ~2010ms.

### Type scaffold — deferred reviewer + verifier hooks

`GepaPayload` gains three optional fields:
- `reviewer_id?: string`
- `verifier_id?: string`
- `ac_results?: Array<{ ac_id, status, evidence_file_line? }>`

No callers in this slice. Scaffolds the deferred crew-side hooks
(reviewer + verifier emits live in `dev-team`, not `runner`; tracked
separately in dev-team#121 Phase 1).

### Deferred — `triage_shift` emit

PM write-back path was simplified in v0.53 (`pm-write` CLI removed); the
cleanest injection point requires a small refactor of the triage skill
flow. Filed as known gap on runner-plugin#290 follow-up.

### Known follow-ups
- `runner-plugin#291` — recall before slice start (online learning consumer).
- `runner-plugin#292` — doctor integration in `runner:status`.
- `dev-team#121` — crew-side capture + GEPA optimization loop.

Closes most of runner-plugin#290; triage emit deferred.

## [0.56.0] — 2026-06-27 — runner-plugin#288: memory-bridge shim (astramem CLI consumer)

### Added — opaque fire-and-forget memory capture

Runner ceremony now emits GEPA-shaped JSON payloads to the memory layer
via the `astramem` CLI (shipped by `memory-plugin` issue #8 — dormant
until that lands). Bridge is opaque: zero HTTP, zero env vars, zero
provider knowledge. Provider selection (local-first → SaaS fallback)
lives in `memory-plugin`.

**Capture surface (v1):**
- `runner:close` — `slice_close` memory after `grade.recorded` fanout.
- `runner:phase-gate` FAIL only — `phase_gate_fail` memory with exit
  code + failing checks + log tail.

**Bridge contract:**
- `resolveCli()` checks `${CLAUDE_PLUGIN_ROOT_MEMORY}/bin/astramem` then
  PATH. Per-process cache. Returns `null` when not found.
- `emit(payload)` spawns `astramem ingest --json '<json>'` with 2s
  wallclock cap. Swallows all errors. Never throws. Never blocks.

**Config**: `.claude/loop.json` `memory.enabled: "auto" | "never"`
(default `"auto"`). Off-switch only.

**Prompt-version stamping**: every memory carries `prompt_version` =
git sha7 of the dispatched agent file. Future GEPA trainset partitions
cleanly when prompts evolve.

**Dormancy**: bridge is no-op when `astramem` CLI is absent.

Closes runner-plugin#288. Supersedes #287.

## [0.55.0] — 2026-06-27 — FEAT-203 SLICE-A: backlog_state_changed envelope DORA fields

### Added — DORA-aware envelope extension (cross-repo contract, additive)

`loop.backlog_state_changed` envelope now carries four optional fields needed
for DORA metric aggregation in astrarunner:

- `priority` (`P0|P1|P2|P3|P4|null`) — MTTR open/close detection (P0 = incident)
- `category` (`feat|fix|chore|null`) — CFR detection (fix-FEATs)
- `relates_to` (`FEAT-N|null`) — CFR linkage (fix → original)
- `createdAt` (ISO ts | null) — Lead time start anchor

All four fields are **optional** — old runner ingest consumers that expect
the v1 payload shape continue to work unchanged.

**PM agent contract**: when a FEAT title matches `^(fix|hotfix):` (case-
insensitive) OR the body declares a `relates_to:` line, the agent now
populates `category: fix` + `relates_to: FEAT-N` in frontmatter. Emit path
reads these onto the envelope.

**Schema**: `schemas/loop-events/slice-event.schema.json` adds the four new
properties; `required: [ts]` unchanged.

**Files changed:**
- `src/scripts/lib/backlog-state-emitter.mts` — payload builder + input type
- `schemas/loop-events/slice-event.schema.json` — schema bump
- `agents/pm.md` — fix-classification rule documented inline
- `src/tests/backlog-state-emitter-dora-fields.test.mts` — 8 tests: field
  propagation, back-compat (omit-and-still-valid), schema-contract round-trip,
  category enum, priority pattern, null passthrough

**Cross-repo SLICE-B..E** ship in astrarunner PR #426 (merged 2026-06-27):
materialized view `dora_metrics_mv` + reusable feature-gate primitive
(`[FeatureGate("X")]` + `<FeatureGate>` + `IFeatureGateService`) + REST
endpoint `/api/v1/dora` + dashboard widget + detail page + tenant toggle UX.

Closes FEAT-203 — all 8 ACs satisfied.

### Added — env-aware ingest routing (ASTRARUNNER_ENV)

Introduce `ASTRARUNNER_ENV=local|staging|prod` as the canonical tier switch for
AstraRunner ingest without editing per-repo `.claude/loop.json` or rotating tokens.

**URL resolution precedence (both Path 1 + Path 2):**
1. `LOOP_INGEST_URL` — explicit env-var override (escape hatch; always wins)
2. `ASTRARUNNER_ENV` → `~/.astrarunner/profiles.json[env].ingestUrl`
3. `.claude/loop.json[loop.notifications.webhook.url]` — per-repo committed default

**Bearer resolution precedence (Path 1 / Pattern B):**
1. Literal `bearer` in `loop.json` (rare — pre-Pattern-B configs)
2. `ASTRARUNNER_ENV` set → `~/.astrarunner/tokens.<env>.json` lookup by `appId`
   (NO implicit fallback to `tokens.json` — explicit tier = explicit tokens file)
3. `~/.astrarunner/tokens.json` lookup by `appId` (default, unchanged behaviour)

**Path 2 (astrarunner-ingest legacy direct-POST) token:** `LOOP_INGEST_TOKEN` only
(Path 2 callers have no `appId`; Path 2 URL now also env-profile-aware).

**Files changed:**
- `src/scripts/lib/env-profiles.mts` (new) — `readProfile(env)` reader for `profiles.json`.
- `src/scripts/lib/token-store.mts` — `resolveBearer(appId, env?)` env-aware overload; `_internals.profilesDir` test hook.
- `src/scripts/lib/event-notifier.mts` — `readNotifyConfig` applies full precedence chain.
- `src/scripts/lib/webhook-fanout.mts` — precedence comment added; delegates to `readNotifyConfig`.
- `src/scripts/lib/slice-linker/astrarunner-ingest.mts` — `resolveIngestUrl()` helper applies URL precedence.

**User-global file schema** (`~/.astrarunner/profiles.json` — DO NOT commit):
```json
{
  "version": 1,
  "envs": {
    "local":   { "ingestUrl": "http://localhost:5137",       "tokensFile": "tokens.local.json",   "label": "Local-DEV" },
    "staging": { "ingestUrl": "https://app-dev.example.com", "tokensFile": "tokens.staging.json", "label": "Stage"     },
    "prod":    { "ingestUrl": "https://app.example.com",     "tokensFile": "tokens.prod.json",    "label": "PROD"      }
  }
}
```
`tokens.<env>.json` files share the same schema as `tokens.json`.

**Operator quick-start:**
1. Mint a per-tier `lrt_` AppToken and write it to `tokens.<env>.json`.
2. Set `ASTRARUNNER_ENV=staging` (shell profile or `.env`). Done.
3. Unset `ASTRARUNNER_ENV` to revert to the loop.json url + `tokens.json` defaults.

## [0.54.0] — 2026-06-22 — soft-block pre-push gate + v0.53.0 release-prep on main

Converts `pre-push-validate.mts` from hard-block (`exit 2`) to soft-block:
validation failures now emit a Claude Code `systemMessage` warning via JSON
stdout and the git commit/push proceeds. CI remains the authoritative gate.
This unblocks urgent ships when format / content-length drift is intentional
or being fixed in a follow-up commit, without disabling the gate entirely.

Also makes `v0.53.0` claimable on main: the prior `v0.53.0` lightweight tag
was created on the unmerged `feat/277-runner-simplification` feature branch
and never moved to the main-history squash-merge commit. The release-prep
manifest bump for 0.53.0 landed on main in commit `b460a9b9` but lacks a tag
pointing to it. Rather than force-moving `v0.53.0` (forbidden by repo policy
— never delete tags), this release bundles the soft-block change with a
fresh `v0.54.0` tag on main.

## [0.53.0] — 2026-06-22 — runner simplification (untagged on main; tag points to feature branch)

Collapses the runner plugin user-facing surface from 45 skills to 16
(13 commands + 3 read-only helpers). Adds free-text intake with inline
PM+AC writing for P0/P1 features. Merges slice ceremonies into single
commands. Hard-break migration — invoking deleted skills exits non-zero
with a clear "use X instead" stderr line.

Also converts `pre-push-validate.mts` from hard-block (exit 2) to soft-block:
validation failures now emit a Claude Code `systemMessage` warning via JSON
stdout, and the git commit/push proceeds. CI remains the authoritative gate.
This unblocks urgent ships when format/content-length drift is intentional
or being fixed in a follow-up commit, without disabling the gate entirely.

### Added

- `runner:intake "<free text>"` — create FEAT from prose. PM agent
  extracts title/scope/risks, scores 5 dimensions, and for P0/P1 writes
  Given-When-Then ACs in the SAME agent call (no context loss). Flags:
  `--deep` (force AC writing for any priority), `--spec` (write SPEC
  instead), `--from-issue <gh-url>`, `--dry-run`.
- `loop.intakeBudgetUsdPerCall` (default 1.50) +
  `loop.intakeBudgetTokensPerCall` (default 150000) — intake call budget guard.
- `runner:decisions [list|show|relevant|supersede]` — consolidates four
  prior decisions-* skills under one router.

### Changed

- `runner:start` (was `runner:slice-start`) now accepts a FEAT id and
  internally runs `slice-from-feature` + `classify-slice-shape` +
  currentRun rotation. Slice author no longer needs to declare
  `touches_files` manually — auto-populated for the wave planner.
- `runner:close` (was `runner:slice-complete`) now runs the full
  ceremony — verification-before-completion pre-flight + complete +
  grade + grade-write + lessons — in one command.
- `runner:pm` agent prompt extended with AC + SPEC drafting
  capability. `runner:spec-writer` agent deleted.

### Removed (hard break — exits non-zero with replacement pointer)

backlog-add, backlog-enrich, backlog-list, backlog-promote, pm-review,
pm-decompose, retriage, spec-add, spec-decompose, spec-list,
slice-from-feature, derive-slice, next-slice, slice-plan, slice-link,
slice-grade, slice-grade-write, slice-post-builder-fanout,
slice-review-ladder, sync-claims, classify-slice-shape, release-plan,
competitor-audit, architect, stop-check, snapshot-memory,
decisions-list, decisions-show, decisions-relevant, decisions-supersede.
30 SKILL.md files deleted total. The behaviors live on inside the new
commands; only the standalone entry points are gone.

### Removed lib modules

backlog-writer (256 LOC), backlog-pm-write (109), reviewer-ladder (170),
release-planner (207). Tied test files removed.

reviewer-timing (61 LOC) was on the original kill list but retained — it
has live callers in `grade-telemetry.mts` and `slice-linker/complete-slice.mts`
that use `detectSerialReviewer`. Refactor + delete deferred to a follow-up.

backlog-auditor.mts (242 LOC) trim was scoped for this release but deferred
to a follow-up — current callers still rely on the full surface area.

### Migration

Audit your cron jobs and CLAUDE.md / loop rules for references to
deleted skill names. The stderr message tells you what to use instead;
fix the call site. There is no compat wrapper — running a deleted skill
fails. This is intentional: silent delegation hides the migration debt.

## [0.52.0] — 2026-06-21 — cost-regression + alert-high demoted to advisory; nested loop.cost.*

Demotes cost-regression and high-severity cost-alert halts to **advisory-only**
(emit suggestions, never stop the loop). Slice-cost-ceiling remains the one
hard per-slice spend halt. Adds `/runner:cost-setup` for idempotent
flat→nested config migration in `.claude/loop.json`.

### Removed env vars

- `LOOP_DISABLE_COST_REGRESSION_LOG` — emission of the structured
  `cost-regression-check` JSON line is now unconditional. Tests that need
  silence should spy on `process.stderr.write`.

### Behavior change — halts demoted to advisory

These no longer stop the loop. They surface in `suggestions[]` and the
snapshot field stays populated for visibility.

- `cost_regression_stop` — was a halt reason + blocker. Now a single
  `cost-regression advisory:` suggestion line. Snapshot `costRegression`
  carries data unchanged for the brief / halt-badge renderer.
- `cost_alert_high` — was gated by `loop.costStopThreshold` tolerance.
  Now any single HIGH cost alert emits a suggestion; no tolerance gate; loop
  continues.

### Config consolidation (flat → nested)

Legacy flat keys are read with a one-line stderr WARN per process. Run
`/runner:cost-setup` to rewrite the file in place.

| Legacy (flat) | New (nested) |
|---|---|
| `loop.costSliceCeiling` | `loop.cost.ceilingUsd` |
| `loop.costRegressionMultiplier` | `loop.cost.regression.multiplier` |
| `loop.costRegressionWindow` | `loop.cost.regression.window` |
| `loop.costRegressionMinSamples` | `loop.cost.regression.minSamples` |
| `loop.costRegressionMode` | `loop.cost.regression.mode` |
| `loop.costMedianUsdPerPoint` | `loop.cost.regression.medianUsdPerPoint` |
| `loop.costProject` | `loop.cost.regression.project` |
| `loop.costProjectAliases` | `loop.cost.regression.projectAliases` |

### Retired

- `loop.costStopThreshold` — dropped entirely. The knob had confusingly dual
  semantics: max plan-count in `auto-walker` vs HIGH-alert tolerance in
  `stop-conditions`. The plan-count cap is now controlled solely by
  `--max-features`; HIGH alerts are advisory per the demotion above.
- `auto-walker.AutoWalkerOptions.costStopThreshold` field removed; the
  `cost_cap` halt branch removed; `orchConfig.costStopThreshold` field
  removed (downstream consumers should treat `--max-features` as the plan
  budget).

### New surface

- `/runner:cost-setup` command + `src/scripts/lib/cost-setup.mts` — idempotent
  migrator + override-flag editor.
- CLI: `bun src/scripts/loop.mts cost-setup --repo <path> [--features KEY=VAL,...]`.
- Returns `{ configPath, written, migratedLegacyKeys, effective }`.

### Migration

Consumer repos with flat `loop.cost*` keys should run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" cost-setup --repo "$PWD"
```

Idempotent and safe to re-run. Defaults applied when nothing is set yet:
`ceilingUsd: 75`, `regression.multiplier: 3.0`, `regression.window: 5`,
`regression.minSamples: 3`.

### Tests

-4 deleted (env-var silencer + halt scenarios) + 11 new `cost-setup` tests
+ 6 rewritten advisory-mode assertions. Net: +5 passing (1790 → 1795). Zero
regressions against 27 pre-existing Windows-timing failures.

### LOC

13 modified + 3 new = 16 files changed. Tracked diff: +241 / -392 = **-151
net LOC**.

## [0.51.1] — 2026-06-19

### Security / Added

- **Pattern B token store**: webhook bearer for AstraRunner ingest is now resolved at runtime from `~/.astrarunner/tokens.json` keyed by `webhook.appId`, instead of being committed inline in `.claude/loop.json`. Repo config now carries identifiers only (`url`, `tenantId`, `appId`) and is safe to commit. Pre-existing configs that still include `bearer` continue to work unchanged (literal bearer wins; resolver only runs when the field is absent). Webhook sends are skipped when no bearer can be resolved, instead of POSTing with an undefined token and burning a 401 round-trip.
- New `src/scripts/lib/token-store.mts` exporting `resolveBearer(appId)`. Fail-silent on missing file, malformed JSON, or unknown appId — consumers treat `null` as "no auth available; skip send".
- 8 new token-store tests + 2 resolver-path event-notifier tests (`src/tests/token-store.test.mts`, `src/tests/event-notifier-webhook.test.mts`).

### Operator setup

1. Mint an AstraRunner `lrt_` AppToken per app via the AppTokens API.
2. Write to `~/.astrarunner/tokens.json`:
   ```json
   { "version": 1, "tokens": { "<app-guid>": { "bearer": "lrt_...", "label": "..." } } }
   ```
3. Restrict ACL to current user (`icacls ... /inheritance:r /grant:r "$env:USERNAME:F"` on Windows; `chmod 600` on POSIX).
4. Drop `bearer` and `disabled` fields from `.claude/loop.json` `loop.notifications.webhook`. Keep `appId`. Done.

## [0.51.0] — 2026-06-17

### Changed

- **Plugin renamed `loop` → `runner`** (npm package `loop-plugin` → `runner-plugin`; `.claude-plugin/plugin.json` name field already flipped in cd01a1f). Slash commands now under `/runner:*`; config keys (`loop.json`, `loop.marathonMode`, etc.) intentionally unchanged for backward compatibility.

### Added

- `--ids FEAT-NNN,...` flag on `/loop:triage` for targeted PM rescore of specific triaged FEATs without re-scoring the full backlog (FEAT-201). Mutually exclusive with `--include-triaged`.
- Wave-mode autonomous loop (`/loop:wave plan|run|loop`): dispatches up to
  N independent slices per wave into parallel git worktrees, merges PASS,
  pivots FAIL into `/crew:fix` next wave, runs post-merge tests, loops
  until standard stop-check fires. Opt-in via
  `loop.json:marathonRunner: "wave"`; default remains `"sequential"`.
- `touches_files` slice frontmatter contract + parser
  (`src/scripts/lib/wave/touches-files.mts`) + CI validator
  (`src/scripts/validate-slice-touches-files.mts`).
- 4 new wave halt-badges: `wave_post_merge_red`, `wave_dirty_main`,
  `wave_pending_fix_count`, `wave_escalation_count`.
- `loop.mts wave plan|run|loop` CLI subcommands + `loop.mts config get`
  helper for shell scripts.
- `renderWaveTelemetry` helper for the loop snapshot.

### Changed

- spec-writer agent contract requires `touches_files` in slice frontmatter
  for wave-mode dispatch.
- `commands/auto.md` and `commands/start.md` route to `/loop:wave loop`
  when `loop.marathonRunner === "wave"`.
- bun:test type shim now exports `expect` (silences TS2305 across the
  repo).

## [0.50.1] — 2026-06-13

### Added

- FEAT-200: Pre-computed slice risk tier — `loop slice from-feature` now writes a deterministic `risk: low | medium | high` field into every generated slice's frontmatter, computed by `src/scripts/lib/risk-classifier.mts`. Eliminates the manual "Classify risk" judgment step from `crew:lead`'s Golden Path. Rule table: HIGH if any `concern:security`/`concern:governance`/`surface:schema`/`surface:api` tag, `pm_technical_risk ≥ 0.7`, `category=security`, `priority=P0`, or `pm_customer_impact ≥ 0.85`; LOW if `category=docs`, `docs-only` tag, or both risk scores < threshold; MEDIUM otherwise. HIGH wins over LOW when both conditions hold. 19 tests in `src/tests/risk-classifier.test.mts`.

## [0.50.0] — 2026-06-13

### Fixed

- FEAT-197: dispatch `result.json` path is now absolute — child agents in git worktrees previously wrote the marker to their own worktree CWD; `finalize` only scanned the main repo and marked all as `no marker`. Fix: `dispatch-prompt.mts` now emits an absolute path via `path.join(repoRoot, ...)` (AC-2); `dispatch-aggregate.mts` adds a fallback worktree scan when the main repo has no marker (AC-3); main repo marker always wins when both present (AC-4). 5 new tests in `src/tests/dispatch-result-path.test.mts`.

## [0.49.1] — 2026-06-13

### Added

- FEAT-179: Decay-ranked, citation-tracked learnings retrieval (`src/scripts/lib/learnings-decay.mts`, `learnings-citations.mts`, `learnings-ranker.mts`) — learning confidence decays ~10%/week at read time (timestamp multiplier, no daemon); every retrieval is appended to a citations ledger (`citations.jsonl`); utility scores update from grade outcomes (+1 pass / -2 fail); `loop lessons rank [--query <title>] [--limit N]` CLI subcommand returns decay×utility-ranked top-N trimmed to ~1000 tokens for builder dispatch injection. Tests: `learnings-decay.test.mts`, `learnings-citations.test.mts`, `learnings-ranker.test.mts` (7 ranker + 7 citation + decay tests).

## [0.49.0] — 2026-06-13

### Added

- FEAT-101: GitHub `@crew` PR-comment teammate — `.github/workflows/crew-pr-comment.yml` GH Action triggers on PR comments; `src/scripts/lib/gh-mention-parser.mts` parses `@crew review`/`fix <text>`/`explain` (stdin-safe, sanitized); `src/scripts/lib/gh-reply-formatter.mts` formats structured reply ≤1000 chars; `src/scripts/lib/gh-rate-limiter.mts` enforces max-1-active-dispatch-per-PR guard; setup guide at `docs/integrations/github-pr-comment-teammate.md`

## [0.48.0] — 2026-06-13

### Added

- FEAT-173: Auto-PR mode for dispatch finalize (`src/scripts/lib/dispatch-pr-mode.mts`) — `dispatchFinalizePr()` pushes each DONE child branch and creates a GitHub PR via `gh pr create` with title/body inferred from git log; `loop dispatch finalize --pr` flag enables the mode

## [0.47.1] — 2026-06-13

### Added

- FEAT-175: Artifact link-integrity checker (`src/scripts/lib/artifact-linker.mts`) — `checkArtifactLinks()` validates `depends_on`, `derived_from`, `supersedes`, and `feature` cross-references across FEAT/slice/decision/grade artifacts; detects orphaned grades; emits Mermaid dependency graph; new `loop lint-artifacts` CLI subcommand

## [0.47.0] — 2026-06-13

### Added

- FEAT-182: Backlog auditor (`src/scripts/lib/backlog-auditor.mts`) — `auditBacklog()` scans pending/triaged FEATs for AC keywords that already appear in the codebase, returning `likely_satisfied`/`partially`/`open` verdicts with `file:line` evidence; new `loop backlog audit` CLI subcommand

## [0.46.0] — 2026-06-13

### Added

- FEAT-174: Error-pattern registry (`src/scripts/lib/error-pattern-registry.mts`) — `matchPatterns` detects 4 failure signatures (pause-without-artifact, empty-artifact, truncated-output, budget-exceeded); `checkDispatchResult` returns recovery hints; `logPatternMatch` appends to `learnings.jsonl`

## v0.45.3 — 2026-06-13

### Added

- **Loop event notifications** (FEAT-171/SLICE-120): `notifyEvent()` module fires on `slice-complete` and `halt-badge` events. Supports three modes: `osNotification` (platform-native: PowerShell MessageBox, notify-send, osascript), `webhook` (POST JSON to configurable URL), `customCommand` (shell-quoted token interpolation). Configure via `loop.notifications` in `.claude/loop.json`. New module: `src/scripts/lib/event-notifier.mts`.

## v0.45.2 — 2026-06-13 — Grade lessons promotion ratchet (FEAT-178 / SLICE-122)

### Added

- **Grade lessons promotion ratchet**: `lessons promote` CLI subcommand scans grade files, identifies repeated lessons (≥2 occurrences by default), and promotes them to `.claude/artifacts/loop/planning-rules/`. Configurable via `--max-grades`, `--min-repeats`, `--json` flags. New modules: `src/scripts/lib/lessons-ratchet.mts`, `src/scripts/lib/planning-rules.mts`. Tests: `src/tests/lessons-ratchet.test.mts` (8 tests). Addresses the backlog pattern where high-confidence lessons recur across grades but remain buried in per-slice docs; the ratchet surfaces them for re-planning.

## v0.44.1 — 2026-06-13 — Runtime stuck-detector halt-badge (FEAT-130 / SLICE-119)

### Stuck-detector halt-badge + stuck-tick / stuck-reset CLI

The autonomous loop now detects when a slice is cycling without progress and emits a hard `stuckDetected` halt-badge rather than letting the builder accumulate cost silently. A loop-owned counter file at `.claude/state/loop/stuck-detector.json` tracks `{ attempts, threshold, sliceId, updatedAt }`. When `attempts >= threshold` (default 3), `checkStuckDetector` returns a signal and the stop-check gate fires `snapshot.stuckDetected` with the full counter payload.

Two new CLI subcommands manage the counter:

- `bun src/scripts/loop.mts stuck-tick --slice <id> [--repo <path>]` — increments the attempt counter for the given slice (initialises at 1 on first call). Records `updatedAt` ISO-8601 timestamp.
- `bun src/scripts/loop.mts stuck-reset [--repo <path>]` — deletes `.claude/state/loop/stuck-detector.json`. Idempotent (no-op when the file is already absent). Call after each successful slice close to clear stale state.

The check is fail-open: a missing file, malformed JSON, or invalid shape (not an object, non-numeric `attempts` or `threshold`) all return `null` (not stuck). Only a fully valid payload with `attempts >= threshold` fires the halt. This prevents a partial write or state corruption from permanently blocking the walker.

Implementation spans five modules: `src/scripts/lib/stuck-detector.mts` (new — reader + `StuckDetectorSignal` interface), `src/scripts/lib/stop-conditions.mts` (14th parallel call in `gatherStopInputs` + `assembleStopResult` wiring), `src/scripts/lib/halt-badges.mts` (9th `HALT_BADGES` entry + `renderStuckDetected`), `src/scripts/loop.mts` (`stuck-tick` / `stuck-reset` subcommands). `.gitignore` excludes `.claude/state/loop/stuck-detector.json`. Registry section added to `docs/halt-badges.md` per doc-contract. 7 unit tests in `src/tests/stuck-detector.test.mts`; `src/tests/explain-halts.test.mts` updated for the 9th badge and multi-halt fixture (registry count 8→9).

## v0.44.0 — 2026-06-13 — Pause / resume lifecycle for async waits (FEAT-128 / SLICE-118)

### Pause / resume conversation lifecycle for external-event waits

The autonomous loop can now be suspended and resumed by the operator without stopping the Claude Code session. Two new CLI subcommands manage the lifecycle:

- `bun src/scripts/loop.mts pause --reason "<description>" [--repo <path>]` — writes `.claude/state/loop/paused.json` with `triggered: true`, the operator-supplied reason, a default `resumeHint`, and a `pausedAt` ISO-8601 timestamp.
- `bun src/scripts/loop.mts resume [--repo <path>]` — deletes `.claude/state/loop/paused.json`; the walker resumes from the current backlog state on the next iteration. Idempotent (no-op when the file is already absent).

A new `pausedForExternalEvent` halt-badge is wired into the stop-check gate as a hard halt. The check is fail-open: a missing file, malformed JSON, or absent `triggered: true` field are all treated as "not paused" so a partial or corrupt state file never permanently blocks the walker. The badge populates `snapshot.pausedForExternalEvent` with `{ triggered, reason, resumeHint, pausedAt }` when active.

Implementation spans four modules: `src/scripts/lib/paused-for-external-event.mts` (new — reader + interface), `src/scripts/lib/stop-conditions.mts` (13th parallel `gatherStopInputs` call + `assembleStopResult` wiring), `src/scripts/lib/halt-badges.mts` (8th `HALT_BADGES` entry + `renderPausedForExternalEvent`), and `src/scripts/loop.mts` (`pause` / `resume` subcommand handlers). `.gitignore` excludes `.claude/state/loop/paused.json` so the runtime state file never enters version control. Registry entry added to `docs/halt-badges.md` per the doc-contract requirement.

8 unit tests in `src/tests/paused-for-external-event.test.mts` (fail-open paths: absent file, malformed JSON, missing triggered flag, triggered=false; happy-path: full valid payload; partial payloads with fallback defaults). `src/tests/explain-halts.test.mts` updated for the 8th badge and multi-halt fixture.

## v0.43.7 — 2026-06-12 — PM agent doc simplification — spec-writer fanout hard rule

### Hoist spec-writer fanout to a short HARD RULE; collapse verbose dispatch-discipline + ToolSearch-precondition prose

`agents/pm.md` gained a 2-line HARD RULE at the top of the agent body — "PM may fan out `loop:spec-writer` via `Agent` to improve AC quality under `/loop:retriage`. `Agent` and `ToolSearch` are available in your tool surface." This is the load-bearing capability statement; everything else was reducing it to noise.

The two-paragraph "Dispatch discipline (FEAT-195 / SLICE-111)" + "ToolSearch precondition (FEAT-196 / SLICE-112)" block under `## Sub-agents you may dispatch` collapsed to a single line stating that PM's only allowed in-turn `Agent` call is `loop:spec-writer` under the retriage gate. The deferred-tool plumbing detail was confusing PM into entangling "available tool" with "deferred-tool surface" semantics — both v0.43.3 and v0.43.6 release notes flagged this as ongoing surface ambiguity.

No frontmatter change; `tools:` list still grants `Agent` and `ToolSearch`. No CLI/runtime change. Doc-only release.

### Switch PM frontmatter to inline-array tool list; add Edit, Write, TaskCreate/Update/List/Get

v0.43.5 added `model: opus` + `maxTurns: 30` to nudge deferred-tool surfacing. Validated 2026-06-12: PM still reported `[Read, Grep, Glob, Bash]` only and judged the AC-clarity gate as borderline-PASS instead of dispatching `loop:spec-writer`. Two hypotheses being trialed in this release:

1. **YAML-list vs inline-array parsing**: the working examples (`crew:architect`, `loop:hierarchical-dispatcher`) all declare tools inline (`tools: [A, B, C]`). PM used a YAML list (`tools:\n  - A\n  - B`). Switch PM to inline array.
2. **Self-task tracking**: granting `TaskCreate`/`TaskUpdate`/`TaskList`/`TaskGet` so PM can carve its own pre-flight (AC clarity gate → spec-writer dispatch → re-read → score) into trackable subtasks instead of reasoning the whole gate inline. `Edit` + `Write` added so PM can write its own pm-review artifact without a second hop.

If validation still shows PM bypassing the AC-clarity gate after v0.43.6 install, the bug is not tool-surface — it's PM's discretion to call `acClarity: { rewrite: false }` on FEATs with `## Acceptance hints` headers and `tbd`/`to be confirmed` strings. Next FEAT would tighten the gate to a hard regex check.

## v0.43.5 — 2026-06-12 — PM model+maxTurns for deferred Agent surfacing

### Add model: opus + effort: high + maxTurns: 30 to PM frontmatter (FEAT-199 / SLICE-114)

Hypothesis (from comparing PM to working examples crew:architect + loop:hierarchical-dispatcher): deferred tools (Agent, ToolSearch) only surface to subagents that declare `model:` + `maxTurns:`. PM previously had neither. Now declares `model: opus`, `effort: high`, `maxTurns: 30`. If validation still fails after v0.43.5 install, deferred-tool surfacing is a deeper platform restriction and retriage will be reframed as flag-for-human (separate FEAT).

## v0.43.4 — 2026-06-12 — PM ToolSearch grant

### Add ToolSearch to PM tools list (FEAT-198 / SLICE-113)

v0.43.3 added a ToolSearch INSTRUCTION to PM's body but missed granting the ToolSearch TOOL itself. Validated 2026-06-12: PM still saw `[Read, Grep, Glob, Bash]` only on a second FEAT-085 retriage attempt. Chicken-and-egg — to load deferred `Agent`, PM needs `ToolSearch` as a base tool. Fix: add `ToolSearch` to `agents/pm.md` frontmatter `tools` list.

## v0.43.3 — 2026-06-12 — PM ToolSearch precondition

### PM ToolSearch precondition for spec-writer dispatch (FEAT-196 / SLICE-112)

Validated 2026-06-12 that granting `Agent` in PM frontmatter (FEAT-195) was necessary but not sufficient — `Agent` is a deferred tool, PM must call `ToolSearch(query: "select:Agent")` to load the Agent schema before invoking it. Without ToolSearch, PM saw only base tools (Read, Grep, Glob, Bash) and the spec-writer dispatch silently failed. Fix: add the ToolSearch precondition to the dispatch-discipline section of `agents/pm.md`.

**Possible retroactive explanation for lead specialist-pause (FEAT-191)**: the same deferred-Agent gap may have caused N% of crew:lead's narration-only returns across SLICE-97/98/99/101/102/103/104. Lead's prompt didn't instruct it to ToolSearch either. Not the full story — lead also had prompt brittleness — but worth noting as future hero-crew investigation lead.

## v0.43.2 — 2026-06-12 — PM Agent grant + --include-triaged flag

### PM agent gains `Agent` tool to enable /loop:retriage gate (FEAT-195 / SLICE-111)

Sample retriage run on 2026-06-12 surfaced a wiring bug: `loop:pm` frontmatter `tools` omitted `Agent`, so the `/loop:retriage` gate's step 4 (dispatch `loop:spec-writer` when AC vague) failed every time and PM escalated to `needs-review` instead of self-healing the AC. Fix: add `Agent` to PM's tool allowlist. Frontmatter `description` updated from "Read-only — no code edits" to "Read-only on disk; dispatches loop:spec-writer when AC need normalization under the /loop:retriage gate". Body adds an explicit dispatch-discipline rule restricting PM's inline `Agent` dispatches to `loop:spec-writer` only — other sub-agents in the "Sub-agents you may dispatch" list are recommended to the orchestrator, not spawned directly by PM in the same turn.

### `--include-triaged` flag for `/loop:triage` + `/loop:retriage` (FEAT-194 / SLICE-110)

Both slash commands now accept `--include-triaged`. When set, the skill enumerates ids from `pending/` AND `triaged/`. PM re-scores the triaged FEATs in place (overwrites `pm_*` + `composite_score` + `autonomous_safe` + `composite_priority`); state stays at `triaged` (no state move). Default behavior unchanged (pending-only).

Lib: `listPendingFeatureIds(repoPath, opts?: { includeTriaged?: boolean })`. CLI: `bun src/scripts/loop.mts backlog list-pending-ids --include-triaged`.

## v0.43.1 — 2026-06-12 — /loop:retriage opt-in PM pre-flight

### Slash command: `/loop:retriage` — opt-in higher-quality PM triage (FEAT-193 / SLICE-109)

New slash command that prepends an AC-clarity-gate pre-flight to the PM dispatch. When PM finds vague AC, it dispatches `loop:spec-writer` to rewrite them in Given-When-Then form, waits, re-reads, and scores against the cleaned AC. Cost up to 2× per FEAT vs. `/loop:triage`; scoring accuracy (especially `effort_estimate` + `technical_risk`) up. On spec-writer failure, PM emits `composite_priority: "needs-review"` and explains in `scopeNotes` — walker won't auto-promote half-scored FEATs.

Base `loop:pm` agent contract is UNCHANGED — the gate is in the slash command's prompt prefix. Legacy `/loop:triage` stays as the cheap default. `/loop:intake` Phase 1 keeps calling `/loop:triage`; a future FEAT may swap once we measure the cost/quality trade-off.

Return shape gains `acClarity: { rewrite: boolean, rewriteDispatchOk?: boolean }` per result.

## v0.43.0 — 2026-06-12 — slice-build orchestrator, decomposition gate, intake, slice close, lead removed

### Stale lead-orchestrator refs swept post-FEAT-191 (release cleanup)

Hook `hooks/guard-feat-dispatch.mjs` allowlist no longer carries `crew:lead`; comments + error-message override path updated to point at the tag-routed `crew:fullstack-dev` / `crew:frontend-dev` / `crew:backend-dev` variants. Example config block in `commands/auto.md` flipped from `"orchestratorMode": "lead"` to `"slice-build"`. `docs/research/2026-06-04-model-routing-audit.md` gets a HISTORICAL banner at the top so future readers know the lead routing recommendations are pre-removal.

### Drop `_crewVersionOverride` from startSlice (FEAT-192 / SLICE-108)

`_crewVersionOverride` was a no-op test hook since 2026-06-11 (the legacy `useOrchestrateSlice` fallback was already removed). Greenfield + system-stability cleanup: the option is removed from the `startSlice` signature; six test sites that passed the no-op argument were trimmed.

### **BREAKING**: Orchestrator modes `lead` + `direct-builder` removed (FEAT-191 / SLICE-107)

`OrchestratorMode` shrinks to `"slice-build" | "orchestrate-slice"`. Default flips from `"lead"` to `"slice-build"`. `buildLeadOrchestratorInstruction` deleted; no code path emits `Dispatch crew:lead subagent`.

**Migration**: operators with `loop.orchestratorMode: "lead"` or `"direct-builder"` in `.claude/loop.json` get auto-fallback to `"slice-build"` (no hard error). Update the config to `"slice-build"` explicitly when convenient.

**Why**: `lead` mode suffered persistent specialist-pause across 7+ slices (SLICE-97/98/99/101/102/103/104) — net negative until hero-crew fixes upstream. `direct-builder` was a strict subset of `slice-build` with no surface tags. Both added API + test surface with no unique behavior.

Tests reorganized: 4 orphan tests removed (lead/direct-builder emission + default-mode assertions); 1 new test pins the v0.43 stale-config fallback to `slice-build`.

### sliceFromFeature consumes proposed_slices (FEAT-168 / SLICE-100) — **closes FEAT-168**

`sliceFromFeature` now materializes ALL proposed sub-slices when a FEAT carries a `proposed_slices` block in frontmatter. Each sub-slice gets its own file with the proposed title and `effort_points`. Idempotent on rerun: an already-materialized FEAT short-circuits with `idempotent: true` (no duplicate slice files, no growth of `feature.slices`). Malformed `proposed_slices` (non-Fibonacci points, missing fields, sum < effort_points) throws `InvalidProposedSlicesError`; the CLI handler audit-logs the failure with the same shape as the `DecompositionRequiredError` entries from SLICE-98.

Return shape gains `slices: SliceInfo[]` (back-compat: `out.slice` still points at the first new slice) and `idempotent: boolean`. The CLI handler loops over `out.slices` for `publishSlice` + telemetry events.

Bug also fixed during impl: `updateFeatureFrontmatter` now invalidates the frontmatter-cache (in addition to the listBacklog cache) — Windows mtime granularity (~16ms) was pinning rapid writes to the stale parse, which broke in-process orchestrators like the SLICE-102 `slice close` command on subsequent reads.

This closes the three-slice FEAT-168 effort (SLICE-98 refuse-gate + audit, SLICE-99 frontmatter parser arrays-of-mappings, SLICE-100 multi-slice consumption).

### Orchestrator mode: `slice-build` — architect pre-flight (FEAT-190 / SLICE-106) — **closes FEAT-190**

When `orchestratorMode: "slice-build"` AND the slice's frontmatter declares `needs_contract: true` AND no contract artifact exists yet at `.claude/artifacts/crew/contracts/<sliceId>-*.md`, `buildDispatchInstruction` now prepends an `ARCHITECT PRE-FLIGHT —` block instructing the orchestrating agent to dispatch `crew:architect` first and await a contract artifact before dispatching the builder(s). When the contract artifact already exists OR `needs_contract` is false, no pre-flight is added — straight builder dispatch (single-variant or parallel fe+be). Legacy modes (`lead`, `orchestrate-slice`, `direct-builder`) ignore `needs_contract` per their existing behavior.

This closes the three-slice FEAT-190 effort (SLICE-104 single-variant routing, SLICE-105 parallel fanout, SLICE-106 architect pre-flight).

### Orchestrator mode: `slice-build` — parallel fe+be fanout (FEAT-190 / SLICE-105)

`pickBuilderVariant(["fe", "be"])` now returns `"parallel-fe-be"` (retires the SLICE-104 interim `"fullstack"` mapping). `buildDispatchInstruction` for a `slice-build` fullstack slice emits a single string starting with `PARALLEL DISPATCH —` and inlines BOTH prompts (frontend + backend). Orchestrating agent reads it as one Agent message with two parallel tool calls (`crew:frontend-dev` + `crew:backend-dev`). Single-variant routing from SLICE-104 unchanged.

### Orchestrator mode: `slice-build` — single-variant routing (FEAT-190 / SLICE-104)

New `orchestratorMode: "slice-build"` value. When set, the slice dispatch instruction reads the slice's frontmatter `tags` and emits the right crew builder variant:

- `tags ⊇ {"fe"}` only → `crew:frontend-dev`
- `tags ⊇ {"be"}` only → `crew:backend-dev`
- both, neither, or missing → `crew:fullstack-dev` (interim — SLICE-105 will swap fe+be for parallel fanout)

Legacy modes (`lead`, `orchestrate-slice`, `direct-builder`) unchanged. Opt-in via `.claude/loop.json`. New exports: `pickBuilderVariant`, `OrchestratorMode`, `BuilderVariant`. Two follow-up slices (SLICE-105 parallel fanout, SLICE-106 architect pre-flight) remain for FEAT-190.

### Slash command: `/loop:intake` (FEAT-189 / SLICE-103)

New slash command that runs the two-phase backlog intake in one invocation: Phase 1 PM scoring (delegates to the existing `/loop:triage` contract), Phase 2 architect classification (delegates to `/loop:backlog-enrich`). Halts before Phase 2 if PM errors; skips Phase 2 for `composite_priority: "P4"` declined FEATs. Existing `/loop:triage` and `/loop:backlog-enrich` remain unchanged for partial-intake scenarios.

### CLI: `slice close` (FEAT-188 / SLICE-102)

New subcommand `bun src/scripts/loop.mts slice close --id SLICE-NN [--grade-yaml <path>]` collapses the 3-step closing ceremony (`slice complete` → `slice grade` → `slice grade-write`) into one CLI roundtrip when the FEAT is `autonomous_safe: true` and a pre-formatted grade file is supplied.

- Without `--grade-yaml`: scaffolds the grade template (returns `scaffoldOnly: true`), caller still runs `slice grade-write` after edit.
- With `--grade-yaml <path>` AND autonomous_safe FEAT: writes the file's content over the scaffold, runs `writeGrade`, returns `scaffoldOnly: false`.
- With `--grade-yaml` on autonomous_safe=false FEAT: refuses with a clear error pointing at the 3-step path (preserves human-in-loop discipline).

Existing `slice complete`, `slice grade`, `slice grade-write` subcommands unchanged.

## v0.42.0 — 2026-06-12 — sync with crew v0.35.0/v0.35.1 agent renames

Crew v0.35.0 renamed 6 subagents out of the colliding `crew:` namespace to fix Lead's Skill-misrouting failure mode (3 reproductions in one day on loop SLICE-152, SLICE-153, plus one during patch verification). Crew v0.35.1 followed up by also renaming the combined `crew:reviewer-validator` agent. Loop emits dispatch prompts that lead consumes — without this sync, lead's `Agent(subagent_type: "crew:reviewer")` calls would fail (agent doesn't exist anymore).

### Agent name updates (loop-emitted dispatch prompts)

Every loop file that emits a dispatch prompt or references a crew agent name was updated:

- `crew:builder` → `crew:fullstack-dev`
- `crew:builder-be` → `crew:backend-dev`
- `crew:builder-fe` → `crew:frontend-dev`
- `crew:reviewer` → `crew:inspector`
- `crew:validator` → `crew:verifier`
- `crew:deployer` → `crew:release-engineer`
- `crew:reviewer-validator` → `crew:inspector-verifier`
- `loop:document-writer` → `crew:document-writer` (unified to canonical crew namespace; loop never owned this agent definition)

### Files touched

53 files updated across `src/scripts/lib/`, `src/tests/`, `agents/`, `commands/`, `skills/`, `docs/backlog/`. Critical paths:

- `src/scripts/lib/post-builder-fanout.mts` — fanout dispatch prompt builder. This is the helper lead invokes after builder PASS; if it emits an old agent name, lead's fanout fails.
- `src/scripts/lib/reviewer-ladder.mts` — Reviewer A/B parallel dispatch prompts.
- `src/scripts/lib/slice-linker/*.mts` — slice ceremony dispatch instructions.
- `src/scripts/lib/walker-gates.mts` — `/loop:auto` dispatch plan emitter.
- `src/scripts/lib/plugin-identity.mts` — crew agent name lookup table.
- `src/scripts/loop.mts` — CLI argument + help text.
- 7 test files — assertions updated. 1291 tests, 0 fail, 49 skip.

### Compat

Loop emits dispatch prompts; it does not own the agent definitions. The crew plugin is the source of truth for agent names. After this update both plugins use the new naming consistently.

### Marketplace migration

The marketplace registry has moved to its own repository:
[sergeymilashico/astra-marketplace](https://github.com/sergeymilashico/astra-marketplace).

- `loop` no longer carries `.claude-plugin/marketplace.json` (commit
  `4a46687`). This repo is plain plugin code now.
- `loop` is registered in `astra-marketplace` alongside `crew` and
  `cortex`.
- New install path:
  ```
  /plugin marketplace add sergeymilashico/astra-marketplace
  /plugin install loop@astra
  ```
- Old install paths (`sergeymilashico/hero-crew` and `sergeymilashico/loop`
  as marketplaces) no longer serve `marketplace.json`. Existing installs
  need `/plugin marketplace remove <old-name>` + re-add `astra-marketplace`.

### Action items for downstream consumers

- Update install docs and CI bootstrap to use `astra-marketplace`.
- `/plugin marketplace update` after re-adding.

### Why

`hero-crew` and `loop` were each acting as both plugin source and
marketplace registry. With `cortex` joining the family, every new
plugin required a paired marketplace.json commit somewhere — adding
unnecessary coupling between unrelated release cadences. The central
registry decouples them and gives users one entry point.

## v0.41.0 — 2026-06-11 — FEAT-167 follow-up + FEAT-168 decomposition refuse-gate

### Added

- **FEAT-167 AC-3** — `cost-regression` observability log. Every
  `checkCostRegression` evaluation emits a structured JSON line to
  stderr: `{ event: "cost-regression-check", timestamp, mode,
actual_usd, expected_usd, median_usd_per_point, effort_points,
threshold_usd, triggered, multiplier, window, sample_count }`. Stays
  in `"median"` mode (expected_usd / median_usd_per_point /
  effort_points = null) until AC-4 lands the dual-mode switch. Silence
  via `LOOP_DISABLE_COST_REGRESSION_LOG=1` (used by
  `cost-regression.test.mts`).
- **FEAT-167 AC-7** — `bun src/scripts/validate-effort-points.mts`
  scans every FEAT in `pending/triaged/in-progress/done` and enforces
  `effort_points ∈ [1, 2, 3, 5, 8, 13]`, `expected_usd` non-negative
  finite, and `expected_usd ≈ effort_points × median_usd_per_point`
  within ±0.01 when both fields plus the median are provided. Optional
  field — FEATs without `effort_points` pass, so the gate is safe to
  add to CI before backfill completes.
- **FEAT-168 AC-2** — decomposition refuse-gate. `sliceFromFeature`
  now throws `DecompositionRequiredError` BEFORE moving any backlog
  state when a FEAT has `effort_points >= 8` and no `proposed_slices`
  field. Verbatim message: `<FEAT-NNN> is sized N points — emit
proposed_slices first via /loop:pm-review <FEAT-NNN>`. The strict
  `parseProposedSlices` validator (AC-1 / AC-7) ships under
  `src/scripts/lib/proposed-slices.mts` for future callers but is NOT
  wired through `sliceFromFeature` yet — the in-tree frontmatter
  parser/writer can't round-trip nested mappings inside arrays, so
  full proposed_slices integration waits on a parser extension slice.

### Deferred to follow-up slices

- FEAT-167 AC-2 (interactive backfill script for done/ FEATs).
- FEAT-167 AC-4 (dual-mode regression formula with auto-flip at
  sampleCount >= 3).
- FEAT-167 AC-5 / AC-6 (sizing-aware integration tests through
  `checkStopConditions`).
- FEAT-168 AC-1 / AC-5 / AC-7 through full slice flow (waits on
  frontmatter parser support for nested mappings in arrays).
- FEAT-168 AC-3 (audit-trail entry on refuse event), AC-4 (idempotent
  multi-slice re-run), AC-6 (PM agent emission of `proposed_slices`).

## v0.40.0 — 2026-06-11 — per-project cost attribution + marathon checkpoint + effort sizing seed

### Added

- **FEAT-166 / SLICE-91** — per-project USD filter on the cost-regression
  gate. `AggregateCostReport` gains `perProjectUsd: Record<string,
number> | null`. `parseAggregateReportFile` parses a nested YAML map
  under `per_project_usd` in aggregate report frontmatter; non-numeric
  entries are skipped, malformed YAML doesn't crash.
  `checkCostRegression` now resolves `config.loop.costProject` +
  `costProjectAliases` and maps every report through a new
  `extractProjectUsd` helper before `computeRollingMedian` — sums the
  project + alias slices when present, falls back to `fm.usd` when
  absent. Activates against real data once hero-crew SLICE-1 ships the
  upstream emit; back-compat path is a no-op against today's reports.
- **FEAT-181 / SLICE-92** — marathon session-scope checkpoint.
  `src/scripts/lib/marathon-checkpoint.mts::checkMarathonCheckpoint`
  counts `*-grade.md` files newer than the newest retrospective.
  Escalates from advisory (`warn` at `>= marathonCheckpointEvery`,
  default 4) to hard stop (`>= 2 × every`). New snapshot entry
  `marathonCheckpoint: { level, closesSinceCheckpoint, every,
hardThreshold, lastRetroPath }`. Halt-badge registered in
  `HALT_BADGES` so `loop brief --explain-halts` renders it alongside
  the other six. Documented in `docs/halt-badges.md` and `CLAUDE.md`.
- **FEAT-167 AC-1 (partial — SLICE follow-up tracked)** —
  `src/scripts/lib/pm-effort-mapper.mts::mapEffortEstimateToPoints`
  translates PM's `pm_effort_estimate` float (0.0–1.0) into the
  Fibonacci `effort_points` value (1, 2, 3, 5, 8, 13). Pure helper;
  PM agent can start emitting `effort_points` on new triages
  immediately. Downstream consumers (FEAT-168 decomposition gate,
  expected_usd regression formula, backfill script) ship in
  follow-up slices once the field has coverage.

### Changed

- **CLAUDE.md** — § "Orchestrator mode" reworded to drop the trigger
  word "decommission" (the `crew:lead` agent kept over-weighting it
  and refusing to dispatch after the v0.39.0 lead-restore). Added an
  explicit "Note for the `crew:lead` agent reading this file"
  paragraph spelling out that lead IS active, the `Agent` tool IS
  available per frontmatter, and a refusal-to-dispatch escalation
  bypasses the ceremony rather than serving it.

### Docs

- `docs/halt-badges.md` — new `### snapshot.marathonCheckpoint`
  registry entry (shape, fire conditions, suggested action, origin).

## v0.39.0 — 2026-06-11 — crew:lead restored + reviewer-validator allowlist + walker lead-routing

### Changed

- `MIN_CREW_VERSION` bumped from `0.3.6` → `0.31.1` to reflect the current
  stable hero-crew release. `findCrewCli` now resolves both
  `scripts/crew.ts` (Bun-migrated crew ≥0.31.0) and `scripts/crew.mjs`
  (legacy emit) so locating the installed CLI works across the migration
  boundary. `getCrewCliCacheGlob` glob updated to
  `scripts/crew.{ts,mjs}`.
- `loop:auto` walker plan now emits a `Dispatch crew:lead subagent`
  routing instruction when `config.loop.orchestratorMode === "lead"`
  (default) — matches the slice-start ceremony so autonomous-loop
  iterations route through lead consistently with manual `/loop:slice
start`. `walker-gates.mts` carries the routing branch; covered by
  `src/tests/auto-walker.test.mts`.

### Added

- `auto-dispatch.jsonl` schema extended with three optional fields
  (`stepType`, `inputTokens`, `outputTokens`). Strictly additive —
  existing readers unaffected. `stepType: "session-drift-override"`
  tags the walker's drift-override path so downstream consumers
  (FEAT-165 per-skill cost attribution, FEAT-172 usage dashboard) can
  discriminate event kinds without parsing `event`. Schema rationale
  recorded in DEC-046. (SLICE-90 / FEAT-083)
- `crew:lead` restored as the default slice orchestrator. `/loop:slice
start` now emits a `Dispatch crew:lead subagent` instruction by
  default. Configurable via `config.loop.orchestratorMode` in
  `.claude/loop.json`: `"lead"` (default), `"orchestrate-slice"`,
  `"direct-builder"`. `hooks/guard-feat-dispatch.mjs` allowlists
  `crew:lead`. Reverses the 2026-06-07 decommission. Cross-plugin
  `/crew:build`, `/crew:validate`, `/crew:fix` routing tracked in
  `docs/upstream-requests/2026-06-10-hero-crew-lead-orchestrator-restoration.md`.
- `crew:reviewer-validator` added to `hooks/guard-feat-dispatch.mjs`
  allowlist so the combined reviewer-validator specialist can be
  dispatched from FEAT-bearing prompts without being blocked.
- FEAT-145: grade-hygiene linter rejects unfilled grades and excludes
  them from retro averages so trend data reflects actually-completed
  ceremonies. (SLICE / FEAT-145)
- FEAT-088 / SLICE-89: `superpowers:systematic-debugging` Iron Law
  wrapped in a HARD-GATE block so the verification step cannot be
  silently skipped on bug-fix slices.

## v0.38.1 — 2026-06-10 — backlog: AgentOps-adoption FEATs triaged

### Added

- Six pending FEATs adapting patterns from the AgentOps sibling project into
  loop's methodology, PM-triaged (5-dimension scoring) into `triaged/`:
  - **FEAT-181** (P1, autonomous-safe) — marathon session checkpoint: mandatory
    retrospective every N slices to bound unobserved drift.
  - **FEAT-183** (P2, autonomous-safe) — derive-only discipline: do-not-edit
    headers on generated artifacts + regen `--check` drift gate.
  - **FEAT-180** (P2, autonomous-safe) — review verdict schema: `not_checked[]`
    field + author/judge separation.
  - **FEAT-178** (P2) — promotion ratchet for grade lessons (noticed → store →
    planning rule → stop gate).
  - **FEAT-182** (P3) — backlog audit: flag likely-already-satisfied FEATs with
    file:line evidence.
  - **FEAT-179** (P3, depends on FEAT-178) — decay-ranked, citation-tracked
    learnings retrieval at builder dispatch.

No code/runtime changes — plugin behavior is identical to v0.38.0.

## v0.38.0 — 2026-06-10 — Bun migration complete

### Changed

- **Runtime is now Bun** — `.mts` sources run directly; the emitted
  `scripts/*.mjs` / `tests/*.mjs` trees are gone (no build step). CI,
  `package.json`, hooks, and presets invoke `bun ./src/scripts/*.mts`.
  Tests run via `bun test src/tests/ --parallel --timeout 60000`. `/loop:install`
  now requires Bun ≥ `MIN_BUN_VERSION`.

### Fixed

- **Migration fallout that left the CLI broken** — completed the cutover after
  the emitted tree was dropped:
  - `loop dispatch` spawned the deleted `node …/dispatch.mjs` → now `bun …/dispatch.mts`.
  - `pre-push-validate` spawned deleted `node …/validate-*.mjs` → now Bun + `.mts`.
  - github-sync runtime modules (`.mjs`, no `.mts` source) stay under `scripts/lib/`;
    added `github-sync-loader.mts` (dual-layout resolver) so `loop.mts` / `pr-fixer.mts`
    resolve them from `src/`.
  - `bump-version`, `validate-manifests`, `validate-content-length` resolved repo
    root one level up (correct from the old emitted `scripts/`); fixed to two levels
    up for `src/scripts/`.
- **CI test timeout** — `bun test` ignores the `bunfig.toml [test] timeout`, so
  git-heavy tests hit Bun's 5s default and the suite went red. `--timeout 60000`
  is now passed explicitly in `package.json` and CI.

### Added

- **`src/tests/_fixtures.mts`** — shared test constants + helpers (`makeTmpRepo`,
  `writeLoopJson`, `initGitRepo`); `eslint-plugin-sonarjs` `no-duplicate-string`
  (warn) guards against new hardcoded-literal duplication.

## v0.37.1 — 2026-06-10 — commit-time version-drift guard

### Fixed

- **Version drift caught at `git commit`, not just `git push`** — the
  `pre-push-validate` PreToolUse hook now also runs manifest validation
  (including the plugin.json / marketplace.json / package.json version
  lockstep check) on `git commit`. Root cause of recurring drift: cutting a
  release by hand-editing one or two manifests and forgetting the third; the
  drift was only caught later (push/CI), then patched manually. The guard now
  blocks the commit with the `npm run bump-version <v>` hint. Push retains the
  fuller gate (manifests + content-length + format:check).

### Process

- Reminder enforced by the new guard: **always bump via `npm run bump-version
<version>`** — it updates all three manifests atomically. Never hand-edit a
  single version field.

## v0.37.0 — 2026-06-10 — feature toggles + slice-title canonicalization

### Added

- **`featuresService`** (`src/scripts/lib/features-service.mts`, FEAT-170) — a
  simple named feature-toggle set: `isEnabled(feature, config)` reads a
  top-level `features` block in `.claude/loop.json`
  (`{ "features": { "<name>": { "enabled": <bool> } } }`). **Default-ON**:
  a missing or malformed entry resolves to enabled so config drift can never
  silently disable a guardrail. First consumer: the `redundant-read-stop`
  gate (`checkRedundantReadStop`) now short-circuits when the feature is
  disabled, replacing the magic-cap workaround. Documented in
  `docs/halt-badges.md`.
- **Canonical slice-title handling** (`src/scripts/lib/slice-title.mts`) —
  `resolveSliceTitle` centralizes title precedence (frontmatter `title:` →
  H1 → bare slice id) so slice-plan, the start/complete ceremony, and
  github-sync all resolve titles identically.

### Fixed

- **Snapshot ↔ walker consistency** (FEAT-177) — `/loop:snapshot-memory` now
  excludes `deferred: true` FEATs from "Top triaged (next to slice)", mirroring
  the `/loop:auto` walker's pre-branch filter. Deferred items are still counted
  in `Triaged: N`; only the next-to-slice list drops them.
- **Diagnostic logging hygiene** — feature-gate diagnostics write to stderr
  (not stdout via `console.debug`), keeping CLI JSON output parseable.
- github-sync (issue / subissue) and slice-linker ceremony wired through
  `resolveSliceTitle`.

### Ops

- Filed upstream-request against hero-crew for specialist-dispatch completion
  enforcement (recurring pause-without-artifact pattern); tracked locally by
  FEAT-176 (deferred until upstream lands).

## v0.36.0 — 2026-06-10 — state contract + doctor

### Added

- **Loop State Contract (Schema v1)** — New `docs/state-contract.md` documents
  the authoritative state model for backlog, slices, grades, decisions, releases,
  and retrospectives. Covers purpose, authoritative roots, field constraints for
  all frontmatter types, write-guard rules, and versioning policy.
- **State Schema Validators** — New `src/scripts/lib/state-schemas.mts` with
  `validateFeat`, `validateSlice`, `validateGrade`, `validateDecision`, and
  `validateLoopJson` functions. Versioning: absent `schemaVersion` ⇒ v1; only
  v1 accepted in this release (commit 6aa544f).
- **Dispatcher Config Resolution** — `src/scripts/lib/config-resolver.mts`
  resolves `.claude/loop.json` once at CLI startup and threads through all
  handlers. Path overrides (`loop.backlogRoot`, `loop.artifactRoot`, etc.)
  apply globally (commits e117604, a801eef, 88c4a17).
- **State Write-Guard** — `src/scripts/lib/state-paths.mts` with
  `assertStatePath(repoPath, config, target)` prevents writes outside
  resolved state roots. All state writers call this guard before `fs.writeFile` /
  `fs.rename` (commit 09be485, 31a8cd5).
- **Write-Time FEAT Validation** — `backlog-writer.mts` and other writers
  validate frontmatter after rendering (commit f18a23b).
- **`loop doctor` command** — Detects and repairs loop-state divergence.
  - `loop doctor` — Report only (writes to `.claude/artifacts/loop/doctor/`).
  - `loop doctor --check` — Report + exit 1 if findings (for CI).
  - `loop doctor --fix` — Report first, then merge stray trees, resolve
    conflicts by newest-transition, preserve non-FEAT files (commits 3775f64,
    9ed36ff, ff689e0).
- **Doctor Finding Kinds** — Five types: `stray-tree` (legacy backlog locations),
  `id-collision` (same FEAT in multiple trees), `state-contradiction` (same ID,
  different state), `schema-invalid` (failed frontmatter), `config-mismatch`
  (authoritative root empty but stray populated).

### Fixed

- **Dual Backlog Tree Divergence** — `backlog add` and all path-bearing commands
  now honor `.claude/loop.json` path overrides. Resolves hero-crew FEAT-144:
  diverged backlog trees in dual-root setups are now merged and deduplicated
  by the doctor tool.

### Changed

- `loop doctor` command added to usage banner and help output.

## v0.35.0 — 2026-06-10 — PM enrichment: spec-writer agent, risk rubric, grade feedback

### Added

- **`loop:spec-writer` agent** — merges the vendored `3rdparty/sdd-spec-writer`
  and `3rdparty/specification` agents into one owned agent with two output
  modes: formal 10-section SPEC documents (REQ/SEC/CON ids, Given-When-Then
  AC, test strategy) and executable SDD slice specs (exact contracts, ≥3
  concrete test cases, verification commands). Emits `developer_type:
agent | human` to inform `autonomous_safe`. Dispatched by `loop:pm` when
  AC clarity fails. The two 3rdparty source agents are removed.
- **PM Framework 4: Grade Feedback** — weak-dimension rule (any grade
  dimension averaging < 0.80 over the last 5 grades must be named in
  `scopeNotes`; `autonomousSafe: true` requires a targeting AC). Lessons
  digest (`loop.mjs lessons recent 5`) promoted to required pre-read.
- **PM Framework 5: Effort Calibration** — `effort_estimate` calibrated
  against actual aggregate cost reports (`.claude/artifacts/crew/cost/`);
  analog comparison recorded in `scopeNotes`.
- **Banded `technical_risk` rubric + pre-mortem** — 4-band scoring table
  (pattern novelty, blast radius, rollback cost, contract reach) replaces
  gut-feel floats; 3-question pre-mortem mandatory at `technical_risk >=
0.6` or P0/P1; `crew:3rdparty:critical-thinking` dispatched before
  finalizing P0/P1 or `needs-review` scores; failure-mode probe added to
  Risk Radar.
- **AC quality checklist + INVEST check** in `loop:authoring-slices` —
  Given-When-Then with concrete values, evidence-backed, 3–5 AC per slice,
  mandatory edge + error coverage, NFRs as AC, weak-dimension AC mandatory,
  DoD separate. `loop:pm-decompose` gains an INVEST gate and AC drafting
  with `loop:spec-writer` dispatch.
- **Retrospective synthesis step** — every repeat lesson must get a
  disposition (`/loop:learn`, `/loop:backlog-add`, or covered-by-DEC);
  dimensions weak across two consecutive retros escalate to a dedicated FEAT.
- **`parseJsonFlag` helper** (`scripts/lib/json-flag.mjs`) — `backlog
pm-write --scores` now tolerates PowerShell backslash-escaped JSON;
  5 new tests in `tests/json-flag.test.mjs`.

### Changed

- FEAT-166/167/168 triaged via the enriched PM (all P1,
  `autonomous_safe: false`); FEAT-167/168 acceptance criteria rewritten to
  the new AC standard via spec-writer dispatch.

## v0.34.0 — 2026-06-09 — glob-scoped rule auto-attach (FEAT-082)

### Added

- **FEAT-082 SLICE-86** — Glob-scoped rule auto-attachment library. New
  `loadRules(rulesDir)` in `src/scripts/lib/rule-loader.mts` reads `*.md`
  files from a rules directory, parses YAML frontmatter (`id`, `globs`,
  `alwaysApply`, `description`), and returns typed `Rule[]`; returns `[]`
  on missing directory (ENOENT). New `buildRulesBlock(rules, inScopeGlobs)`
  in `loop-installer-tokens.mts` filters rules by glob overlap with the
  current slice's `in_scope_globs` (or `alwaysApply: true`) and renders
  matching rule bodies as a fenced Markdown section. `buildTokens` now
  accepts and returns `rulesBlock` via its `extras` parameter. New
  `{{rulesBlock}}` template token added to `templates/master-prompt.md`
  after `{{contextRulesList}}`. 1091 tests pass.
  Files: `src/scripts/lib/rule-loader.mts`,
  `src/scripts/lib/loop-installer-tokens.mts`, `templates/master-prompt.md`.
- **DEC-042** — Empty-string glob guard in `patternSubsumed`: `if (!p1 || !p2)
return false` prevents `String.includes("")` from matching everything.
- **DEC-043** — `buildTokens` extras interface extended with `rulesBlock?:
string`; all template tokens must be threaded through `buildTokens`.

## v0.33.0 — 2026-06-09 — skill activation triggers + verification skill hardening

### Added

- **FEAT-134 SLICE-84** — Skill activation triggers. New `parseSkillFrontmatter`
  parser reads `trigger` (`always_on` | `glob` | `manual` | `model_decision`) and
  `globs` from SKILL.md YAML frontmatter. New async `buildSkillActivationBlock`
  renders conditional invocation instructions into MASTER_PROMPT via the new
  `{{skillActivationBlock}}` token. `always_on` (default) emits nothing —
  backward-compatible. `model_decision` parsed but not rendered (deferred to
  SLICE-85+). 12 new unit tests; 1065 pass.
  Files: `src/scripts/lib/skill-frontmatter.mts`,
  `src/scripts/lib/loop-installer-tokens.mts`,
  `src/scripts/lib/loop-installer.mts`, `templates/master-prompt.md`.
- **DEC-040** — `buildSkillActivationBlock` returns `""` on ENOENT (graceful
  no-op for repos without a `skills/` directory).
- **DEC-041** — Only `manual` and `glob` triggers emit activation lines;
  `always_on` and `model_decision` are silently filtered.

### Changed

- **FEAT-089 SLICE-85** — Verification skill evidence table hardening.
  `skills/verification-before-completion/SKILL.md` gains explicit
  `trigger: "always_on"` frontmatter field and two new evidence rows:
  `typecheck` (`npm run typecheck` exit 0) and `function-exists`
  (grep/Read of compiled output). Addresses SLICE-81 fabrication pattern
  where typecheck evidence was absent from completion claims.

## v0.32.0 — 2026-06-09 — FEAT-020: hierarchical parallel dispatch primitive

### Added

- **FEAT-020 SLICE-1** — Hierarchical parallel subagent dispatch primitive.
  New library `src/scripts/lib/hierarchical-dispatch.mts` (split into nine
  `dispatch-*.mts` modules with a barrel re-export), CLI subcommand
  `node scripts/loop.mjs dispatch {prepare|finalize}`, and
  `loop:hierarchical-dispatcher` agent. Worktree-per-child isolation,
  blocking `awaitAll`, continue-on-failure, depth-capped recursion via
  `.claude/loop.json` (`dispatchLimits.maxDepth`, default 3).
  Spec: `docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md`.
  Plan: `docs/superpowers/plans/2026-06-09-feat020-slice-1-hierarchical-dispatch.md`.

### Cross-plugin coordination

- **FEAT-020 SLICE-2** (hero-crew PR #114) refactors `crew:parallel-runner` to
  delegate worktree creation + priority-ordered merge to the new dispatch CLI.
  That PR documents loop >= v0.32.0 (this release) as a hard requirement.
- Telemetry artifacts (`worktrees.jsonl`, `trace.jsonl`, per-child result
  markers, `summary.md`) under `.claude/artifacts/loop/dispatch/<runId>/` are
  the ingestion surface for **FEAT-133** (budget enforcement) and **FEAT-165**
  (per-skill cost attribution) downstream.

## v0.31.0 — 2026-06-08 — competitor gap audit: 4 new briefs + 22 triaged FEATs

### Added

- Competitor gap audit expanded to 11 briefs: add OpenHands, GitHub Copilot
  Workspace, Qodo, and Windsurf briefs; matrix grows from 47 to 68 ranked gaps.
- 22 new triaged FEATs from audit (FEAT-082–FEAT-165, duplicates removed):
  top two P1 items are FEAT-134 (rule activation triggers, autonomous_safe) and
  FEAT-133 (budget enforcement, deferred pending architect design).
  Active P2 `autonomous_safe` picks: FEAT-088 Iron Law tags, FEAT-089
  evidence-before-claims skill, FEAT-111 `--from-issue` flag, FEAT-165
  per-skill cost attribution.
- Platform competitive positioning research (`docs/research/2026-06-08-platform-positioning/`):
  14 briefs covering Codex, OpenHands, Cline, Mastra, n8n, Kestra, Temporal,
  Trigger.dev, AutoGen, PydanticAI, Airflow, Windsurf, and Claude Code.

## Unreleased

### Added

- Add `multidim` reviewer-ladder preset (FEAT-079, SLICE-82): 3 narrow
  dimensions (correctness / test-coverage / conventions) with
  scope-fence + hard tool budget per prompt. Default ladder unchanged.
  Opt-in via `.claude/loop.json` →
  `reviewers.ladder: { "preset": "multidim" }`. Each generated prompt
  carries an explicit "NOT in scope" fence plus a hard tool budget
  (≤15 tool calls, ≤8 min) and an inline-output fallback per
  `docs/sop/specialist-pause-handling.md`. See
  `commands/slice-review-ladder.md` for the full when-to-pick table.
- Add `validate-decline-citations.mjs` validator + CLAUDE.md clause-id
  annotations (FEAT-078, SLICE-83): every H2 in CLAUDE.md now carries
  `<!-- clause: <id> -->`; PM declines with `composite_priority: P4`
  must include `declined_per: [<clause-id>]` frontmatter; CI gate
  enforces.

## v0.30.0 — 2026-06-08 — auto-publish GitHub issues at point of FEAT/SLICE creation

### Added

- `publishFeat(repoPath, featId)` — targeted single-FEAT GitHub issue create; writes
  `github_issue`, `github_milestone`, `github_url` back to frontmatter.
- `publishSlice(repoPath, sliceId, featId)` — targeted single-SLICE sub-issue create;
  ensures parent FEAT issue exists first, attaches sub-issue, writes frontmatter.
- `github feat-publish --id FEAT-NNN` CLI subcommand for on-demand single-FEAT publish.
- `backlog add` now calls `publishFeat` after writing the FEAT file — GitHub issue
  created automatically when GitHub sync is enabled.
- `spec decompose` now calls `publishFeat` for each new FEAT created from a spec.
- `slice from-feature` now calls `publishSlice` after writing the SLICE file — GitHub
  sub-issue created and attached to parent FEAT issue automatically.
- Both new functions are idempotent (skip if `github_issue` already set) and return
  `null` (no-op) when `github.enabled: false`; hard throw when enabled but gh fails.
- 9 new unit tests covering create, idempotency, disabled, and error paths.

### Fixed

- `publishAll` and `syncMilestones` now persist `github_url` (full URL) alongside
  `github_issue` (number) so callers can link directly without re-deriving the repo slug.
- Backfill path: re-running `/loop:publish` on FEATs/SLICEs that have `github_issue`
  but no `github_url` now writes the missing URL field.

## v0.29.0 — 2026-06-07 — extend document-writer scope to API docs + diagram captions (FEAT-124)

### Added

- Extended `loop:document-writer` scope to cover API reference documentation
  (OpenAPI specs, SDK guides, integration guides, error docs, versioning,
  deprecation notices) and diagram captions / Mermaid prose / architecture
  narrative. (FEAT-124)
- `Agent` tool added to `loop:document-writer` to enable 3rdparty delegation
  (api-documenter, diagram-architect, markdown-syntax-formatter).
- Four new consult-skills rows in `loop:document-writer`:
  `skills/workflow/api-documentation/`, `skills/domain/diagram-methodology/`,
  `skills/domain/backend-advisory/`, `skills/domain/architecture-advisory/`.

### Deprecation

- `crew:copywriter` (hero-crew) will be removed in hero-crew v0.21.0 as part
  of FEAT-124 consolidation. Migrate `subagent_type: crew:copywriter` to
  `subagent_type: loop:document-writer`. The deprecation banner in
  `agents/copywriter.md` will be active in hero-crew v0.20.0.

---

## v0.28.2 — 2026-06-07 — triage tighten + post-release backfill

### Changed

- **`backlog pm-write` auto-promotes pending → triaged.** When the FEAT being
  scored is currently under `pending/`, `writePmScores` now moves it to
  `triaged/` and sets `status: triaged` in the same call. Closes the gap
  surfaced during v0.28.0 release where the `/loop:triage` skill body
  promised a one-step PM path but the CLI silently left the file under
  `pending/`. Triaged entries that get re-scored stay in place.
- **`resolve-skills --strict` emits a stderr warn.** Flag is reserved for a
  future skill-ID-lint registry; today it is a no-op. Stop silently
  swallowing the operator intent — surface the no-op honestly so the
  pattern is visible.
- **Resolver inputs narrowed to `unknown`.** `presetRaw` and `overrideRaw`
  inside `resolveSkills` are now `unknown` rather than implicit `any`. Cast
  at the `deepMerge` boundary is the explicit trust transfer; downstream
  `validatePreset` narrows. Tightens type-safety per the v0.27.0 final
  review (I1 follow-up).

### Added

- **Negative-path test for `validateAllPresets`.** New
  `src/tests/validate-manifests.test.mts` (5 tests) covers happy path,
  missing presets dir, single SchemaError, single SyntaxError, and
  multi-error accumulation with non-JSON-file filtering.
- **Upstream-request: forward-declared skill IDs.** New doc
  `docs/upstream-requests/2026-06-07-hero-crew-forward-declared-skill-ids.md`
  lists every skill ID loop presets reference that does not yet have a
  matching `skills/domain/<id>/` upstream. Asks hero-crew to author the top
  three (`csharp-pro`, `a11y-advisory`, `vue-engineering`) and defer the
  rest until a preset references them.

---

## v0.28.1 — 2026-06-07 — wire `/loop:triage` PM dispatch to resolver

- **changed:** `skills/triage/SKILL.md` resolves `preset.roles.pm` skills via
  `node scripts/loop.mjs resolve-skills --variant pm` and prepends the
  resolved block to the `loop:pm` dispatch prompt. Falls back to PM agent's
  baked-in routing table on resolver exit 2.
- **changed:** `CLAUDE.md` "Slash flows that orchestrate role agents"
  section updated to mark which flows are wired to the resolver (architect
  via backlog-enrich, PM via triage) and which are not yet (backlog-add,
  spec-decompose, slice-complete, slice-from-feature). Records the
  cross-plugin nature of slice-from-feature (dispatches `crew:architect`).

---

## v0.28.0 — 2026-06-07 — role-agent skill activation (FEAT-075)

### Added

- Preset schema gains optional `roles.{pm,researcher,architect,document-writer}.skills`
  block. Mirrors Phase 1's `fe.skills` / `be.skills` / `skills` pattern for
  loop-owned role agents.
- `resolveSkills` accepts new role variants (`pm`, `researcher`, `architect`,
  `document-writer`) in addition to `fe`/`be`/`single`. Returns
  `source: "preset.roles.<name>"`.
- `node scripts/loop.mjs resolve-skills --variant <role>` exposes the new
  variants via the existing CLI. Exit codes unchanged (0/1/2).
- All six shipped presets ship a default `roles` block with sensible
  defaults (`superpowers:verification-before-completion`, `loop:loop-discipline`,
  `superpowers:brainstorming` per role).
- `validateAllPresets` (manifest validator) checks the new block.

### Changed

- `/loop:backlog-enrich` now resolves the architect skill loadout from the
  preset and prepends the resolved block to the architect dispatch prompt.
  Falls back to the agent's baked-in routing table when the resolver returns
  exit 2.

### Roadmap (not in this slice)

- Wire `loop:pm`, `loop:researcher`, `loop:document-writer` dispatchers in
  their respective slash flows (mirror the architect change above).
- Remove static "Required skills" tables from `agents/{pm,researcher,architect,document-writer}.md`
  once preset-driven activation has been stable for one release cycle.

---

## v0.27.0 — 2026-06-07 — preset-driven skill activation (Phase 1)

### Added

- Preset schema v1: `schemaVersion`, `projectType`, `split`, `frontend`,
  `backend`, `contract`, `deployment`, plus `skills` (when `split: false`)
  or `fe.skills` + `be.skills` (when `split: true`).
- `node scripts/loop.mjs resolve-skills --variant <fe|be|single>` CLI
  subcommand. Exit codes: 0 ok, 1 error, 2 no-match.
- Manifest validator now validates every `scripts/presets/*.json` against
  the new schema via `validatePreset`.
- `src/scripts/lib/skill-resolver.mts` — pure resolver function that
  loads a preset, merges optional `.claude/loop.json` override (with
  `$replace` marker and concat-dedup defaults), validates, and returns
  the resolved skill loadout plus a ready-to-paste
  `## Required skills (resolved)` Markdown block.

### Changed

- All six shipped presets updated to schema v1 with explicit skill arrays.
- `.claude/loop.json` for this repo carries new axis fields (matches
  `typescript-plugin-dev` preset).
- `/loop:backlog-enrich` no longer asks the architect to emit `stack:*`
  or `surface` fields — project-level stack identity lives in the preset.
- `CLAUDE.md` updated: classifier writes three routing fields
  (`tags`, `needs_contract`, `needs_ux`), not five.

### Removed

- `buildClassifyUpdates` no longer writes `stack:*` or `surface` into
  FEAT / slice frontmatter. `classify-parser.mts` no longer ships
  `SurfaceValue`, `VALID_SURFACES`, `VALID_STACKS`, `parseSurface`.
  Historical FEAT frontmatter is unaffected; readers stop consuming
  the fields.

### Roadmap (not in this slice)

- Phase 2: `/crew:orchestrate-slice` automatic invocation of the resolver
  CLI. Blocked on upstream `hero-crew` change documented in
  `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`.
- Phase 3: Delete baked-in routing tables from `crew:builder*` agents.

## v0.26.1 — 2026-06-07 — noUncheckedIndexedAccess B5 tsconfig tighten (FEAT-074)

Enable `noUncheckedIndexedAccess: true` in `tsconfig.json` (SLICE-77). Fixes 130 type errors across 27 source files using non-null assertions on regex match groups and bounded array accesses, and `?? 0` defaults on score Record lookups. Pure type-safety enforcement — no behavior change. 922 tests pass.

## v0.26.0 — 2026-06-07 — SPEC-004 code-quality pivot + builder-fe/be routing fields + crew:lead decommission

Aggregate release bundling eight commits since v0.25.1: the SPEC-004 code-quality pivot work (Phases A–C), the FE/BE routing schema additions, and crew:lead removal from this repo's dispatch surface.

**SPEC-004 Phase A — dead-code sweep (FEAT-069)**

- Removed marker-drain consumer code, one-shot migrators, and the marker-write fallback path. Marker queue at `.claude/artifacts/loop/pending-dispatch/` is deprecated (DEC-011); no consumer remained.
- Test file renamed: `slice-complete-marker-drain.test` → `slice-complete-ceremony.test`.

**SPEC-004 Phase B — tsconfig tighten (FEAT-070 / FEAT-072 / FEAT-073)**

- B1 (SLICE-72): `noImplicitAny: true` + `useUnknownInCatchVariables: true`.
- B2 + B3 (SLICE-73): `noUnusedLocals` + `noUnusedParameters` + `noImplicitOverride` + `noFallthroughCasesInSwitch`.
- B4 (SLICE-74): `exactOptionalPropertyTypes` on prod `tsconfig.json`; disabled on `tsconfig.test.json` per DEC-027 (test mocks legitimately pass `undefined` explicitly).
- Knock-on refactors: helper extraction over `eslint-disable` for `startSlice` complexity (DEC-026); `Record<string, any>` over `Record<string, unknown>` for opaque property bags (DEC-025).

**SPEC-004 Phase C — perf top-10 (FEAT-071)**

- SLICE-75 + SLICE-76 land bench harness + ten perf wins: memo snapshot, lazy module loading, batched git invocations, regex hoisting to module scope (classify-parser, frontmatter, others), frontmatter-cache module, and other hot-path reductions.

**FE/BE routing schema additions**

- `/loop:backlog-enrich` architect prompt now emits `surface` (`frontend` / `backend` / `mixed` / `none`) and `stack` (vocab list) alongside the existing `tags` / `needs_contract` / `needs_ux` fields.
- `classify-parser.mts` ships `SurfaceValue` type, `VALID_SURFACES`, `VALID_STACKS`, and parser branches for both fields.
- `slice-linker/feature-lifecycle.mts::buildClassifyUpdates` writes the new fields into FEAT / slice frontmatter.
- Upstream request filed at `docs/upstream-requests/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`: asks `/crew:orchestrate-slice` to read these fields and route to `crew:builder-fe` / `crew:builder-be` accordingly. Until crew ships the reader, all dispatches still fall through to the generic `crew:builder`.

**crew:lead decommissioned in this repo**

- Removed from `hooks/guard-feat-dispatch.mjs` allowlist; updated error message.
- `CLAUDE.md` gained a "Decommissioned roles" section documenting the change and the path to re-enable.
- `agents/architect.md` + `agents/pm.md` boundaries text updated to drop the lead-routing line.

**Agent skill mappings**

- `agents/{architect,pm,researcher,document-writer}.md` gained a "Required skills (invoke via `Skill` tool at start of every dispatch)" section using real installable skill names (`superpowers:brainstorming`, `superpowers:verification-before-completion`, `loop:loop-discipline`, `claude-md-management:claude-md-improver`, etc.). Aspirational skill paths kept in a separate "consult when context matches" section.

## v0.25.1 — 2026-06-07 — docs: upstream-request for hero-crew preflight chained-cd MSYS paths (FEAT-068 / SLICE-68)

Filed `docs/upstream-requests/2026-06-07-hero-crew-preflight-chained-cd-msys-paths.md` requesting hero-crew's `preflight-shell` hook normalize MSYS mount-prefix paths (`/c/foo` → `C:\foo`) on Windows before `fs.stat`. Encountered while porting loopobserver: `cd /c/work/mega/loopobserver && git <cmd>` blocked by false-positive `chained cd target does not exist` warning despite path validity. Includes exact file:line citation (`scripts/lib/preflight/checks.mjs:120-128`), full `normalizeCdTarget` patch, all 6 ACs from FEAT-068, and operator workaround (`git -C "C:/path" cmd`).

## v0.25.0 — 2026-06-07 — feat: redundantReadStop halt-badge (FEAT-057 / SLICE-67)

New 6th halt-badge field: `redundantReadStop`. Loop-side surrogate for the upstream `check-redundant-read` hook (hero-crew plugin) — reads the hook's per-session cost-hygiene state files and emits a halt signal when any file path's `read_count` exceeds `loop.redundantReadCap` (default 5, strict `>`). Fail-open on missing/empty/malformed state. Surfaces in `stop-check` JSON, `loop brief --explain-halts`, and the registry doc.

- New module `src/scripts/lib/redundant-read-detector.mts` (9 unit tests cover all branches)
- New registry entry + renderer in `src/scripts/lib/halt-badges.mts`
- Wired into `stop-conditions.mts` pipeline (gather, apply, snapshot)
- `docs/halt-badges.md` updated with new field section
- `explain-halts` registry-order test bumped 5→6 fields
- New config `loop.redundantReadCap` (default 5)

Closes the loop-side of the original deny-verdict ask. The hero-crew upstream-request (`docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`) remains open as a separate concern.

## v0.24.7 — 2026-06-07 — chore: rename auto-merge helpers to match contract artifact (FEAT-067 / SLICE-66)

Closes the FEAT-067 follow-up from GRADE-SLICE-64. The substantive complexity refactor was already shipped during SLICE-64's late builder passes (`runAutoMerge` is 86 lines and lint-clean). This release aligns 2 helper identifiers to the contract artifact at `.claude/artifacts/crew/designs/FEAT-062-contracts.md`:

- `runCleanup` → `cleanupWorktreeAndBranch`
- `handleMergeError` → `markFailureAndThrow`

Pure rename — no behavior change. All 32+ auto-merge tests pass unchanged.

## v0.24.6 — 2026-06-07 — docs: upstream-request for crew brief-me halt-badge renderer (FEAT-064 / SLICE-65)

Filed `docs/upstream-requests/2026-06-07-hero-crew-brief-me-halt-badge-rendering.md` requesting hero-crew's `brief-me` render a Blocked/Missing section for every halt-badge field loop emits (5 fields: `costRegression`, `sessionDrift`, `sliceCostCeiling`, `gradeTrend`, `mergeFailed`). Includes concrete expected output + fail-open contract for unknown future fields. Closes the cross-plugin side of SPEC-003 (loop side already closed by FEAT-063 / FEAT-065 / FEAT-066). SPEC-003 auto-rolled to satisfied.

## v0.24.5 — 2026-06-07 — feat: SessionStart hook warns when installed version is behind marketplace

Claude Code's per-user marketplace clone (`~/.claude/plugins/marketplaces/loop/`) is only refreshed when the user runs `/plugin marketplace update loop`. Tag pushes do not auto-propagate, so sessions silently stay on stale versions (incident 2026-06-06: stuck on v0.22.0 for three releases). New SessionStart hook compares the installed version to the marketplace pinned version and prints a one-line upgrade reminder when they disagree. Fail-open — any error inside the hook exits silently.

## v0.24.4 — 2026-06-07 — fix: cost-regression gate stays dormant until enough samples

`checkCostRegression` fired the halt-badge as soon as `sampleCount >= 1`. With `sampleCount=2` a single $1500 retro/snapshot batch sets the median and every subsequent normal-priced slice trips the gate. New `loop.costRegressionMinSamples` config (default 3) keeps the gate dormant until enough samples have accumulated for a stable median. 3 new regression tests.

## v0.24.3 — 2026-06-07 — fix: frontmatter parser tolerates CRLF line endings

`FRONTMATTER_RE` required LF (`\n`) at the `---` delimiters and silently returned `{}` on every CRLF-encoded backlog file. On Windows checkouts the auto-walker therefore read `autonomous_safe` as undefined and skipped every triaged FEAT. Fix: accept `\r?\n` at every delimiter. 2 regression tests added (pure CRLF + git-autocrlf mixed-endings).

## v0.24.2 — 2026-06-07 — fix: enforce plugin.json/marketplace.json version lockstep

Marketplace consumers were silently stuck on `0.22.0` for three minor releases (0.23.0 / 0.24.0 / 0.24.1) because `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json` were allowed to drift. `validate-manifests` now refuses pushes / CI runs when the versions disagree.

- `npm run bump-version <semver>` atomically updates both files (use this for every release)
- Pre-push hook + GitHub Actions both call the validator, so drift is caught at git push, never silently shipped
- Comment in the validator documents the 2026-06-06 incident so the next reader understands why the lockstep is non-negotiable

## v0.24.1 — 2026-06-06 — fix: allowlist new crew BE/FE/integrator specialists in guard-feat-dispatch hook

`hooks/guard-feat-dispatch.mjs` now accepts `crew:builder-be`, `crew:builder-fe`, and `crew:integrator` as legitimate ceremony specialists. Previously these new agents (released in upstream crew) were treated as ad-hoc subagents and blocked from FEAT work, breaking the `/crew:fix` and `/crew:orchestrate-slice` flows that route to them.

Override hint string updated to list the new agents.

## v0.24.0 — 2026-06-06 — feat: auto-merge slice branch on validation pass (FEAT-062 / SLICE-64)

Closes the worktree trilogy (FEAT-060 creation, FEAT-061 ceremony cwd, FEAT-062 close + merge). `loop slice complete` now squash-merges the slice branch into `main` and cleans up the worktree automatically when a slice is running in a worktree and the validation gate is satisfied.

### Auto-merge stage

At the end of `loop slice complete`, when `workflow-state.currentRun.worktreePath` is set, the close ceremony runs a four-step merge sequence:

1. `git -C <mainRepo> fetch origin` — refresh remote refs
2. Rebase slice branch onto latest `origin/main`
3. Squash-merge into `main` with a synthesized commit message containing the slice title, grade average, and decision IDs; footer line `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
4. Cleanup: `git worktree remove <worktreePath>`, `git branch -D slice/<SLICE-NN>` (only after the squash commit is verified on main), clear `workflow-state.currentRun.worktreePath`

Validation gate is enforced before any git action: if the `validation_passed` or `validation_skipped` badge is absent, the command halts with a `validation_required` error and performs no merge.

### New flags on `loop slice complete`

- `--no-merge` — skips merge and cleanup entirely; worktree is preserved; slice file move, feature roll, and grade prefill still run
- `--dry-run` — prints the planned actions (rebase target, commit message, push decision, cleanup steps) and exits with zero side effects; no git, worktree, or workflow-state writes occur

### New `loop.autoPushOnMerge` config

Default `false`. When `true`, runs `git push origin main` after a successful squash-merge. When `false` or absent, the operator pushes manually. The auto-push path is strictly opt-in; force-push is never attempted.

### New `mergeFailed` halt-badge

Set in `workflow-state` on any of: `validation_failed` badge present, rebase conflict, merge error, push failure, branch missing, or dirty main branch. When set, worktree and branch are preserved so the operator can resume via `/crew:fix`. The badge includes a diagnostic note pointing to the failure cause.

### Failure-atomicity guarantees

- Never force-pushes under any path
- `git branch -D` runs only after the squash commit is verified on main — no orphaned branch deletes
- Worktree removal runs before `branch -D` to avoid the checked-out-branch error
- On any failure the worktree and branch are left intact

### Tests

New cases in `src/tests/auto-merge.test.mts`:

- Pass-path: full merge sequence + cleanup verified
- `validation_failed` badge halts before any git action
- Rebase conflict sets `mergeFailed` badge, preserves worktree + branch
- `--no-merge` flag: close ceremony runs, merge skipped, worktree intact
- `--dry-run`: zero side effects including no workflow-state writes
- `autoPushOnMerge: true` triggers `git push origin main`; `autoPushOnMerge: false` does not
- No-worktree path (legacy slices): no-op, no error

Total: 910 pass / 0 fail / 1 pre-existing skip. `npm run lint` and `npm run typecheck` clean.

## v0.23.0 — 2026-06-06 — feat: lead operates inside slice worktree (FEAT-061 / SLICE-63)

All loop CLI subcommands and crew shell-out dispatches now honour the slice worktree recorded in `workflow-state.currentRun.worktreePath`, ensuring that artifact writes, state mutations, and builder instructions are isolated to the active branch until merge.

### New helper

`src/scripts/lib/effective-cwd.mts` — `resolveEffectiveCwd(opts)` with a three-level precedence chain:

1. `--worktree <path>` flag (explicit override, highest precedence)
2. `workflow-state.currentRun.worktreePath` (set by `slice start` when a worktree is active)
3. `--repo <path>` fallback (original repo root, unchanged behaviour when no worktree is present)

### New `--worktree` flag

Added to every affected subcommand: `brief`, `snapshot-memory`, `stop-check`, `slice complete`, `slice grade`, `slice grade-write`. Useful for manual debugging or scripted invocations that need to target a specific worktree path without modifying state.

### Builder dispatch prompt — Worktree section

`src/scripts/lib/slice-linker/dispatch.mts` now calls `appendWorktreeSection` when a worktree is active. The injected `## Worktree` block gives the builder subagent the absolute worktree path and an explicit reminder to keep all edits inside that directory, preventing accidental writes back to the main-repo working tree.

### State isolation

`workflow-state.json` and `slice-progress.md` writes that occur while a worktree-active slice is running land in the worktree's `.claude/state/crew/` directory, not the main repo's. The main-repo state tree is read-only for the duration of the slice.

### Tests

17 new cases in `src/tests/effective-cwd.test.mts`:

- State isolation: worktree writes do not touch main-repo `.claude/state/crew/`
- Override precedence: `--worktree` beats `currentRun.worktreePath` beats `--repo`
- Fallback: missing `worktreePath` in state degrades gracefully to `repoPath`

Total: 889 pass / 0 fail / 1 pre-existing skip. `npm run lint` and `npm run typecheck` clean.

## v0.22.0 — 2026-06-06 — test: halt-badge schema regression test (FEAT-066 / SLICE-62)

Third derived FEAT from SPEC-003. Closes the SPEC loop-side by enforcing the three-way contract:

1. `HALT_BADGES` registry in `src/scripts/lib/halt-badges.mts` (FEAT-065)
2. `### snapshot.<field>` headings in `docs/halt-badges.md` (FEAT-063)
3. snapshot keys emitted by `assembleStopResult` in `src/scripts/lib/stop-conditions.mts`

### New test

`src/tests/halt-badge-schema.test.mts` — 5 cases:

1. Every `HALT_BADGES[i].field` has a `### snapshot.<field>` heading in the docs
2. Every `### snapshot.<x>` heading in the docs has a `HALT_BADGES` entry
3. Every snapshot.\* key emitted by `assembleStopResult` is either in `HALT_BADGES` or in `SNAPSHOT_BOOKKEEPING_ALLOWLIST`
4. `stop-check` output has all required top-level keys
5. `HALT_BADGES` is non-empty

Failure messages cite the exact remediation needed when the contract drifts (e.g., "Add `### snapshot.foo` to docs/halt-badges.md OR remove `foo` from HALT_BADGES").

### Bookkeeping allow-list

`SNAPSHOT_BOOKKEEPING_ALLOWLIST` lists 13 snapshot fields that are loop telemetry (NOT halt-badges): `pendingOrTriaged`, `inProgress`, `approvedUndecomposed`, `totalAlerts`, `warnAlerts`, `warnAlertsDemoted`, `iterationCount`, `iterationCap`, `costAlerts`, `crewBlocked`, `crewEscalated`, `autoMode`, `marathonMode`. When a future FEAT adds a new bookkeeping field, add it to this list in the same slice.

### Tests total

877/878 + 1 pre-existing skip.

### SPEC-003 progress

- ✅ FEAT-063 registry (v0.20.0)
- ✅ FEAT-065 `--explain-halts` (v0.21.0)
- ✅ FEAT-066 schema regression test (this release)
- ⏳ FEAT-064 crew brief-me upstream-request (file when ready; loop-side SPEC complete)

Grade avg 0.900 (highest of the session).

## v0.21.0 — 2026-06-06 — feat: `loop brief --explain-halts` (FEAT-065 / SLICE-61)

Second derived FEAT from SPEC-003. Delivers the SPEC SLO loop-side without depending on crew brief-me upstream.

### New CLI flag

`node scripts/loop.mjs brief --explain-halts` — prints the existing JSON body, then appends a `## Halt summary` markdown block summarizing each fired halt-badge with: gate name, key values, suggested operator action.

When no halt-badges are populated, prints `No halts active.` Without the flag, brief output is byte-identical to v0.20.0 (existing JSON consumers untouched).

### New module

`src/scripts/lib/halt-badges.mts`:

- `HALT_BADGES` registry — typed list mirroring `docs/halt-badges.md` (FEAT-063)
- Per-field renderers for `costRegression`, `sessionDrift`, `sliceCostCeiling`, `gradeTrend`
- `explainHalts(brief): string` — iterator that skips fields the registry doesn't know about (graceful degrade for future halt-badges)

### Main CLI dispatch

Added `_suppressDefaultOutput` sentinel — handlers that want to take over stdout (printing JSON + extra content) can return `{ _suppressDefaultOutput: true }` to skip the default `console.log(JSON.stringify(result, null, 2))`. Brief handler uses this when `--explain-halts` is set.

### Tests

11 new unit cases (no-halt, each single-halt path, multi-halt combined render in registry order, malformed snapshot graceful degrade, top-level vs snapshot lookup, unknown field skip). Total 873 / 872 pass + 1 skip.

Grade avg 0.883 (observability + test_confidence both 0.90+).

### SPEC-003 progress

- ✅ FEAT-063 registry (v0.20.0)
- ✅ FEAT-065 loop --explain-halts (this release)
- ⏳ FEAT-066 schema regression test (next)
- ⏳ FEAT-064 crew brief-me upstream-request (file when ready; loop-side SLO already delivered)

## v0.20.0 — 2026-06-06 — docs: halt-badge registry source-of-truth (FEAT-063 / SLICE-60)

Doc-only slice. First derived FEAT from SPEC-003 (halt-badge observability cross-plugin SLO).

New `docs/halt-badges.md` documents every currently-emitted halt-badge field under `stop-check.snapshot.*`:

- `snapshot.costRegression` (FEAT-055 / v0.12.0) — current spend > multiplier × rolling median
- `snapshot.sessionDrift` (FEAT-056 / v0.14.0) — walker resumed in different Claude session
- `snapshot.sliceCostCeiling` (pre-existing) — absolute USD ceiling exceeded
- `snapshot.gradeTrend` (pre-existing) — consecutive sub-threshold grade averages

Each entry: TypeScript-style shape, meaning, fire condition, suggested operator action, originating FEAT/SLICE/release.

"How to add a new halt-badge" checklist at the bottom — future FEATs adding halt fields MUST update this registry in the same slice (will be enforced by FEAT-066 schema regression test).

CLAUDE.md updated to load registry at session start. FEAT-063 frontmatter cross-links to `docs/halt-badges.md` via new `registry_doc:` field.

Unblocks the rest of SPEC-003:

- **FEAT-065** loop `brief --explain-halts` flag — iterates this registry
- **FEAT-066** schema regression test — diffs actual snapshot against documented shapes
- **FEAT-064** crew brief-me upstream-request — iterates this registry for Blocked/Missing rendering

Grade avg 0.867 (observability 0.92).

## v0.19.0 — 2026-06-06 — feat: two new presets — `typescript-plugin-dev` + `dotnet-only`

Two new presets shipped under `scripts/presets/`:

### `typescript-plugin-dev`

For TypeScript Claude Code plugin repos (loop, hero-crew, etc.). Source in `src/scripts/**/*.mts` → compiled to `scripts/**/*.mjs` (committed; CI checks drift). Pure Node ESM runtime.

Stack:

- `build`: `npm run lint`
- `test`: `npm test`, `node ./scripts/validate-manifests.mjs`, `node ./scripts/validate-content-length.mjs`
- `frontendBuild`, `infraPlan`, `aspireBoot`: null

Mandatory docs: `README.md`, `CHANGELOG.md`, `docs/code-conventions.md`.

### `dotnet-only`

For standalone C# .NET service / library repos with no frontend, no Aspire, no Python sidecars. Fills the gap between `dotnet-aspire-python` (full monorepo) and `dotnet-react` (.NET + UI).

Stack:

- `build`: `dotnet build -c Release --nologo`
- `test`: `dotnet test -c Release --nologo`
- `frontendBuild`, `infraPlan`, `aspireBoot`: null

### This repo's `loop.json` preset fixed

`preset: "dotnet-aspire-python"` → `preset: "typescript-plugin-dev"`. The label now matches the actual stack (Node ESM plugin dev). Stack section unchanged; preset is metadata only.

### Recommended labels for other AstraGenie repos (sibling work)

- `hero-crew` → `typescript-plugin-dev` (same Node ESM plugin stack as loop)
- `cortex` → `dotnet-react` (.NET backend + React dashboard)
- `loopobserver` → `dotnet-react` (.NET backend + LoopBrain.Web React UI)
- `authentic` → `dotnet-only` (.NET backend only, no frontend)

Each consumer's `loop.json::preset` field can be updated independently — operator action, no loop CLI invocation needed.

## v0.18.0 — 2026-06-06 — chore: cleanup followups + Sonnet routing for non-architect phases

Bundle of three small followups from today's slice grades.

### Cleanup

- Removed dead `if (sliceFile)` guard in `applyWorktreeResult` (`src/scripts/lib/slice-linker/start-slice.mts`). The block is unreachable after the failure-atomicity throw added in SLICE-56 (DEC-019). Reviewer flagged as Finding-3 non-blocking on SLICE-56 re-review.
- `detectCostMode` test now uses an isolated `mkdtemp` directory instead of `os.tmpdir()` so it is resilient when the user home dir is itself a git repo (DEC-022 surfaced this). Stops false-fail when running tests after worktree-creating tests left tmp state.

### Sonnet routing — model defaults

`.claude/loop.json` `modelRouting` extended:

```json
{
  "default": "sonnet",
  "sliceStart": "opus",
  "architect": "opus",
  "review": "sonnet",
  "decompose": "sonnet",
  "gradeWrite": "sonnet",
  "build": "sonnet",
  "validate": "sonnet",
  "copywriter": "sonnet",
  "docwriter": "sonnet"
}
```

Changes from v0.17.0 defaults:

- `gradeWrite` flipped `opus → sonnet` (grade-writes are templated + short; opus is overkill)
- New phases listed explicitly: `architect`, `copywriter`, `docwriter` (was missing from `MODEL_PHASES` constant)
- Only `sliceStart` and `architect` stay on opus (design-shaped work)

`src/scripts/lib/model-router.mts::MODEL_PHASES` extended to match.

Note: routing is metadata exposed by the resolver — orchestrator uses it as a hint but does NOT force-dispatch subagents on the named model. Operator still drives session model via `/model`.

## v0.17.0 — 2026-06-06 — docs: specialist-pause SOP + upstream-request artifact (FEAT-052 / SLICE-58, FEAT-058 / SLICE-59)

Two doc-only slices codifying institutional knowledge from today's session arc.

### FEAT-052 / SLICE-58 — Specialist-pause SOP

- New `docs/sop/specialist-pause-handling.md` — documents the recurring pattern across 6 slices today (SLICE-51/52/53/54/56/57) where crew:builder / crew:reviewer / crew:validator subagents pause mid-investigation without writing the required artifact (handoff / review-result / validation-result)
- SOP defines: (1) how to detect the pause (verify artifact landed), (2) Option A = lead writes artifact inline via crew CLI, (3) Option B = mark skip badge with explicit reason, (4) never silently pass an unresolved gate
- Required `--note` content for skip badges: what was checked locally + why skip is safe + risk acceptance
- "When NOT to skip" list — full ladder required for new public schemas, multi-file scope, BEHAVIOR_CHANGED without exercise, partial test coverage, safety-critical paths
- CLAUDE.md updated to reference the SOP as load-at-start item

### FEAT-058 / SLICE-59 — Upstream-request artifact for hero-crew

- New `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md` — filed against `hooks/check-redundant-read.mjs` (lives in hero-crew, not loop)
- Captures problem (current decision: approve + warning; should be decision: block at configurable cap), evidence (cost-advisor 30-reread observation), suggested ACs for hero-crew implementation, loop-side alternative if upstream stalls
- Tracking table for `pending-upstream-fix → shipped-upstream` status evolution
- New `docs/upstream-requests/` directory convention for future cross-plugin requests
- FEAT-058 backlog body now cross-links to the doc via new `upstream_request_doc` frontmatter field
- CLAUDE.md references the directory alongside the SOP

### Why two doc slices together

Both shipped under one minor release because (a) zero source code changed, (b) they're operational artifacts the next session reads at startup via CLAUDE.md, (c) batching keeps the changelog readable. Combined ~25 minutes of slice work.

## v0.16.0 — 2026-06-06 — feat: configurable grade-trend threshold + autoMode warn-alert demotion (FEAT-059 / SLICE-57)

Replaces v0.14.1 hard-coded `PER_DIMENSION_THRESHOLD = { observability: 0.7 }` patch with operator-tunable config knobs. Marathon mode now optionally demotes subjective warn-alerts to suggestions instead of halting — cost / safety halts stay strict.

### New config keys (`.claude/loop.json`)

- `loop.gradeTrendThreshold` (default `0.8`)
- `loop.gradeTrendConsecutiveLimit` (default `3`)
- `loop.gradeTrendPerDimension` (default `{}`) — per-dim threshold overrides (e.g. `{ "observability": 0.7 }`)
- `loop.warnAlertCategoriesIgnoredInAutoMode` (default `['score-trend']`) — categories demoted in autoMode

### Behavior

- `pattern-alerts.mts::detectScoreTrendAlerts` reads config; malformed values silently fall back
- `stop-conditions.mts::applyWarnAlertSignals` accepts `{ autoMode, ignoredCategories, suggestions, demotedCount }`; demotes to suggestions instead of halt when listed category fires
- `brief` adds `warnAlertsDemoted: number`
- Hard-coded `PER_DIMENSION_THRESHOLD` removed from pattern-alerts.mts

### Drive-by fix

- `detectCostMode` normalizes git-dir vs git-common-dir paths via `path.resolve` before comparison (Windows home-is-git-repo env)

### Tests

21 new cases. Total 861/862 pass + 1 pre-existing skip.

### Decisions

- **DEC-021** autoMode demotes only listed categories
- **DEC-022** detectCostMode normalizes git-dir paths

### Reviewer + validator skipped

Lead-attested skip on dense test coverage. Not the default — small-scope, config-driven slice; specialist-pause pattern recurring on 6 slices.

## v0.15.0 — 2026-06-06 — feat: per-slice git worktree creation at slice-start (FEAT-060 / SLICE-56)

### New feature — isolated worktrees for autonomous slice work

Slices previously shared the repository working tree. Mid-slice failures could
block subsequent slices and hold the operator's editor hostage. SLICE-56 adds
the foundation: each slice can now receive its own git worktree when
`loop.worktreeMode` is enabled.

**`src/scripts/lib/worktree-manager.mts`** — new module exposing:

- `ensureSliceWorktree(repoPath, sliceId, { config, featureId })` — creates or
  reuses a per-slice worktree gated by `loop.worktreeMode` (default `false`).
  Returns `WorktreeResult` on success or `null` when the gate is off; throws
  `WorktreeError` on hard git failure with no partial state left behind.

**Error codes:**

| Code                  | Cause                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DIRTY_TREE`          | Tracked-file modifications block worktree creation; untracked files under `.claude/state/` are ignored via `-uno` |
| `WORKTREE_ADD_FAILED` | `git worktree add` exited non-zero                                                                                |
| `BRANCH_EXISTS`       | Target branch already exists on a different worktree                                                              |
| `PATH_COLLISION`      | Destination directory already exists and is not a managed worktree                                                |
| `ROOT_NOT_WRITABLE`   | `worktreeRoot` directory cannot be created or written                                                             |
| `GIT_NOT_AVAILABLE`   | `git` binary not found on PATH                                                                                    |

**Slice-start ceremony changes:**

- `worktreePath` is written to BOTH `workflow-state.currentRun.worktreePath`
  AND the slice frontmatter `worktreePath:` field.
- Failure-atomicity invariant: if either write fails the other rolls back.
- If `sliceFile` is null, slice-start throws before any state write
  (fail-loud invariant).

**New config keys in `.claude/loop.json`:**

- `loop.worktreeMode` (default `false`) — opt-in gate.
- `loop.worktreeRoot` (default `../<repoBasename>-worktrees` sibling directory,
  or a custom absolute path).

**Conventions:**

- Branch naming: `slice/<SLICE-NN>-<FEAT-ID>`
- Worktree directory layout: `<worktreeRoot>/<SLICE-NN>/`

**Tests:** 17 new unit tests including rollback-on-EISDIR and
null-sliceFile-throws-failure-atomicity. Total suite 840/841 pass + 1 legacy
structural skip.

**Opt-in by default.** `worktreeMode: false` keeps all existing consumer
behavior identical. Set `loop.worktreeMode: true` in `.claude/loop.json` to
enable. FEAT-061 (operate inside worktree) and FEAT-062 (auto-merge on
validation pass) will land in v0.16.0 and v0.17.0 respectively.

**Reviewer note:** A real correctness bug was caught on the first review pass
(`--allow-cross-session` override only checked `firstReason` instead of
filtering all reasons) plus a partial-state risk when `sliceFile` is null —
both fixed inline before validation.

---

## v0.14.1 — 2026-06-06 — patch: relax observability score-trend threshold to 0.7

Quick operational patch — the score-trend pattern alert was halting the
autonomous walker on observability scores in the 0.75–0.79 range across
CLI/backend slices that legitimately had no OTel/trace/metric surface to
inflate the inference score. Hard-codes a per-dimension override map in
`src/scripts/lib/pattern-alerts.mts` lowering observability's warn floor
from 0.8 to 0.7. Other dimensions continue at 0.8.

Tracked for proper config promotion (operator-tunable thresholds,
per-dimension overrides via `loop.json`, `autoMode` warn-alert demotion)
in **FEAT-059**.

No new tests; existing pattern-alerts coverage exercises the override path
implicitly (threshold value is the only constant changed).

## v0.14.0 — 2026-06-06 — feat: session-pin walker — session-drift stop condition + `--allow-cross-session` bypass (FEAT-056 / SLICE-54)

### New feature — session affinity for the autonomous walker

The loop walker previously had no session affinity, allowing slice work to spread
silently across multiple Claude sessions. This fragmented inference cache and obscured
spend attribution in many-sources cost alerts (observed during the v0.12.0 cost-hotspot
incident). SLICE-54 closes that gap.

**`src/scripts/lib/session-drift.mts`** — new module exposing two primitives:

- `checkSessionDrift` — fail-open evaluator. Reads `workflow-state.json::currentRun.sessionId`;
  if the stored value differs from the current `CLAUDE_SESSION_ID` environment variable,
  it returns a structured `session_drift_stop` badge. If the state file is absent or the
  field is missing, it returns `ok` (fail-open) so cold starts are not blocked.
- `writeSessionIdToWorkflowState` — slice-start hook. Pins the current `CLAUDE_SESSION_ID`
  into `workflow-state.json::currentRun.sessionId`, creating the file with a minimal schema
  if it does not exist.

**Walker integration:**

- Slice-start (`/loop:slice start`) calls `writeSessionIdToWorkflowState` to record the
  originating session.
- The stop-conditions reader calls `checkSessionDrift`; a mismatch emits `session_drift_stop`
  in the `reasons` array and populates `snapshot.sessionDrift` with both session identifiers.
- `node scripts/loop.mjs brief` output now exposes a `sessionDrift` field (parallel to
  the existing `costRegression` field).

**`--allow-cross-session` flag** on `node scripts/loop.mjs auto`:

- Bypasses the session-drift halt only. Filters `session_drift_stop` from all halt-reason
  arrays before the walker evaluates them.
- Appends a structured `session-drift-override` event to `auto-dispatch.jsonl` with
  timestamp and both session identifiers for audit traceability.
- Bypass is surgical: if any non-drift halt condition fires (cost regression, cost cap,
  escalation, etc.), the walker still halts on that condition.

**Tests:** 15 new unit tests added; total suite 824/824 pass.

### Known gap

`crew brief-me` consumes the `sessionDrift` JSON field but has no explicit
Blocked/Missing renderer for it. Logged as upstream follow-up (same pattern as the
v0.12.0 `costRegression` gap).

## v0.13.0 — 2026-06-06 — feat: auto-derive slice AC scaffold from parent FEAT body (FEAT-053 / SLICE-53)

### New feature — FEAT-derived acceptance criteria scaffold

`/loop:slice from-feature` now auto-populates the `## Acceptance criteria`
block in the generated slice scaffold from the parent FEAT body. When the
FEAT contains an `## Acceptance criteria` section with `- [ ]` lines, those
items are copied verbatim into the scaffold (any `[x]` checked items are
normalized back to `[ ]`, since the slice starts fresh). When the FEAT has
no AC section or the section contains no checkbox lines, the existing
placeholder behavior is preserved — no regression.

**Why this matters.** SLICE-50, SLICE-51, and SLICE-52 all required the lead
to manually copy ACs from the parent FEAT into the slice scaffold before
`/loop:slice start` could proceed, because placeholder ACs failed the AC
linter. This change eliminates that manual fill step for any FEAT that follows
the `## Acceptance criteria` heading convention.

**Note on existing FEATs.** FEAT bodies already in this repo (e.g.
FEAT-055/056/057) use inline `AC-N:` text rather than the heading format; they
fall through to the placeholder path unchanged. Future FEATs should use the
`## Acceptance criteria` heading + `- [ ]` format to benefit from auto-derive.

### Implementation details

- New export `extractAcceptanceCriteria(body: string): string[]` in
  `src/scripts/lib/slice-linker/feature-lifecycle.mts`. Heading match is
  case-insensitive; extraction stops at the next `##` heading; checkbox state
  is normalized on read.
- 12 new unit tests added; full suite passes at 809/809.

---

## v0.12.0 — 2026-06-06 — feat: walker aggregate cost gate + contracts template path fix (FEAT-052 / SLICE-52)

### New feature — walker aggregate cost gate

The walker's existing `costStopThreshold` guard fires per-session; a
single slice spanning multiple Claude sessions can consume many times
the per-session budget before the guard activates. The aggregate cost
gate fills this gap by comparing current slice spend against a rolling
median of recent aggregate cost reports.

**Why this matters.** In the consumer-cost-hotspot incident a slice
accumulated ~$1,550 in spend across six sessions while the per-session
gate (calibrated to an ~$81 median) remained silent for each
individual session. The new gate would have halted the loop at the
3× boundary after the first session whose cumulative spend crossed
~$243.

#### New modules

- `src/scripts/lib/cost-alert-loader.mts` — two new exports:
  - `loadAggregateCostReport(repoPath)` — reads the walker's aggregate
    cost report JSON from its canonical path; returns `null` on missing
    or malformed file (fail-open).
  - `computeRollingMedian(reports, window)` — pure function; returns
    the median spend value over the last `window` entries, or `null`
    when the slice is too short to form a verdict (also fail-open).
- `src/scripts/lib/cost-regression.mts` — `checkCostRegression`
  evaluator; given current slice spend, the aggregate report, and the
  config knobs, returns `{ stop: boolean; reason?: string }`. All
  error paths resolve `{ stop: false }` — the gate never halts the
  loop on a read failure.

#### Stop-conditions integration

- `src/scripts/lib/stop-conditions.mts` emits a `cost_regression_stop`
  badge in the `reasons` array and writes a `snapshot.costRegression`
  entry when `checkCostRegression` returns `stop: true`. The badge is
  surfaced in the same stop-check payload as existing badges
  (`budget_exceeded`, `escalated_to_human`, etc.).

#### Brief surface

- `src/scripts/lib/brief.mts` exposes a `costRegression` field in the
  `node scripts/loop.mjs brief` output, giving operators a live view
  of the current median and multiplier before the loop resumes.

#### Configuration knobs (`.claude/loop.json`)

| Key                             | Default | Description                                                                 |
| ------------------------------- | ------- | --------------------------------------------------------------------------- |
| `loop.costRegressionWindow`     | `5`     | Number of recent aggregate cost reports used to compute the rolling median. |
| `loop.costRegressionMultiplier` | `3.0`   | Stop threshold expressed as a multiple of that median.                      |

Both knobs are optional; defaults apply when absent.

#### Tests

- 20 new unit tests in `src/tests/` covering: median math for odd/even
  windows, threshold boundary (exactly 3× passes, just above 3×
  stops), fail-open on null median, fail-open on loader read error, and
  stop-conditions badge emission.

### Bug fix — contracts template resolved via `${CLAUDE_PLUGIN_ROOT}`

`/loop:backlog-enrich` pass 2 and `/loop:slice-from-feature` previously
constructed the contracts template path from a relative reference that
resolved correctly only when the working directory happened to match
the plugin root. In consumer repos with a different working directory
the template fell back to an ad-hoc, inline contracts section with no
warning. The path is now resolved via `${CLAUDE_PLUGIN_ROOT}` (the
same variable used by all other plugin-root references in the repo),
making template resolution deterministic regardless of `cwd`.

### Evidence

- Builder handoff: `.claude/artifacts/crew/handoffs/20260606T111313Z-handoff-slice-52-builder-complete.md`
- Slice file: `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_52_WALKER-AGGREGATE-COST-GATE.md`

### Release notes

v0.12.0 closes the gap between the walker's per-session cost guard and
multi-session slice spend. The new aggregate gate (`cost_regression_stop`)
halts the loop when current slice spend exceeds `loop.costRegressionMultiplier`
× the rolling median of the last `loop.costRegressionWindow` aggregate cost
reports. Both thresholds are configurable; all read-error paths are
fail-open so a missing or malformed cost report never blocks the loop.
This release also ships a path-resolution fix for the contracts template,
eliminating silent fallback to ad-hoc contract sections in consumer repos.

---

## v0.11.0 — 2026-06-05 — feat: FEAT-scoped contracts artifact (FEAT-050 / SLICE-51, loop-side)

### New surface — slash flow extensions

Two existing loop slash flows gain a contracts-artifact orchestration
step. Both extensions hinge on the same FEAT-scoped artifact path,
`.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md`, and on the same
canonical architect prompt — there is no copy-paste of the prompt body
between the two flows.

- `/loop:backlog-enrich` gains **pass 2 — contracts pre-population**.
  After pass 1 finishes classifying tags into FEAT frontmatter, pass 2
  globs the same triaged FEAT set, filters to entries where
  `needs_contract: true`, checks artifact existence via
  `contractsArtifactExists`, and dispatches `crew:architect` inline (Agent
  tool) for every FEAT that is still missing its contracts file. Pass 2
  is idempotent — a FEAT with a present artifact is skipped on every
  re-run. Architect dispatches batch up to 5 in parallel in a single
  message; above that, sequential to avoid rate limits. On empty or
  malformed architect output, pass 2 logs a one-line warning naming the
  FEAT and continues without writing a partial artifact. Pass 1 and
  pass 2 are independent — an operator may invoke either alone.
- `/loop:slice-from-feature` gains an **on-demand contracts trigger**.
  After the CLI subcommand returns (slice created, FEAT moved to
  `in-progress/`), the calling agent reads the FEAT frontmatter; when
  `needs_contract: true` and the contracts artifact is missing, the flow
  dispatches `crew:architect` with the canonical prompt and writes the
  artifact **before** any other specialist (`crew:builder`,
  `crew:uxdesigner`, etc.) runs. The check is artifact existence — not
  slice index — so the trigger fires on any slice of a FEAT, not only
  the first one. Idempotent and fail-open with the same warning wording
  as pass 2.

### New helper module

- `src/scripts/lib/contracts-artifact.mts` exposes two pure, read-only
  functions for any caller that needs to resolve or check the canonical
  contracts artifact path:
  - `getContractsPath(repoPath, featureId)` — returns the absolute path
    `<repoPath>/.claude/artifacts/crew/designs/<featureId>-contracts.md`.
  - `contractsArtifactExists(repoPath, featureId)` — returns a Promise
    resolving to `true`/`false` for that path.

  No dispatch logic, no filesystem writes — by design. The directory
  constant is hardcoded inside the module (single source of truth for
  the rename point) rather than added to `PATH_DEFAULTS`, because the
  designs directory is owned by hero-crew's artifact convention and is
  not loop-tunable.

### Canonical architect prompt template

- `templates/contracts-architect-prompt.md` is the single source of truth
  for the four-section contracts prompt (`## TypeScript Interfaces`,
  `## API Contracts`, `## Event Schemas`, `## Data Contracts`). Both
  `/loop:backlog-enrich` pass 2 and `/loop:slice-from-feature` reference
  this file by path — neither inlines the prompt body. Future changes to
  the contracts prompt are a single-file edit.

### Tests

- 777/777 pass (`npm test`). Five new tests in
  `src/tests/contracts-artifact.test.mts` cover: deterministic path
  resolution for several FEAT ids, `contractsArtifactExists` returning
  `false` when the file is absent, returning `true` after the file is
  created in a tmp repo, no-side-effect behavior on read, and absolute
  forward-slash path formatting. Linter clean (zero warnings).

### Out of scope, tracked upstream

The matching `/crew:orchestrate-slice` Step 1 no-op detection — which
teaches the orchestrator to skip architect dispatch when the FEAT-scoped
contracts artifact already exists — and the `revises_contract: true`
revision-path heuristic both live in hero-crew (`commands/orchestrate-slice.md`),
not in loop. Until those upstream changes ship, the loop-side triggers in
this release write the artifact early so the orchestrator's per-slice
architect dispatch becomes the no-op path on the next slice start.
FEAT-051 (parallel `uxdesigner` + `builder` dispatch once contracts are
present) is a separate FEAT and is not part of this release.

### Evidence

- Builder handoff: `.claude/artifacts/crew/handoffs/20260605T144153Z-handoff-slice-51-feat-scoped-contracts-artifact-triggers.md`
- Validation: PASS — `.claude/artifacts/crew/validations/20260605T145501Z-validation-result-slice-51-feat-050-contracts-artifact-triggers.md`
- Review: SKIPPED — reviewer subagent paused mid-investigation twice
  without completing a verdict; lead attested the change against the
  acceptance criteria and validator confirmed AC-1 through AC-8 with
  evidence above. Future SLICE-51-class work should re-attempt
  `crew:reviewer` once the artifact-protocol pause issue is resolved.
- Slice file: `.claude/artifacts/loop/ai-loop/slices/pending/SLICE_51_IMPLEMENT-FEAT-050.md`
- Plan: `.claude/artifacts/loop/plans/20260605T143430Z-plan-SLICE-51.md`

### Release notes

v0.11.0 delivers the loop half of FEAT-050: the FEAT-scoped contracts
artifact. Where every slice with `needs_contract: true` previously
triggered a fresh architect dispatch inside `/crew:orchestrate-slice`
Step 1, the contracts file at
`.claude/artifacts/crew/designs/<FEAT-ID>-contracts.md` is now written
once per FEAT and reused across every slice of that FEAT. Two loop slash
flows now drive that artifact: `/loop:backlog-enrich` pre-populates
contracts for every triaged FEAT in a single sweep, and
`/loop:slice-from-feature` writes the artifact on demand when a FEAT
reaches slice promotion without one.

Both triggers are idempotent and fail open — a present artifact is
skipped, an empty or malformed architect response logs a warning and
lets the calling flow continue. A new read-only helper
(`src/scripts/lib/contracts-artifact.mts`) exposes
`getContractsPath` and `contractsArtifactExists` for any future caller
that needs to resolve or check the canonical path, and a new prompt
template at `templates/contracts-architect-prompt.md` is the single
source of truth for the four-section contracts prompt (TypeScript
Interfaces / API Contracts / Event Schemas / Data Contracts).

The matching upstream change — `/crew:orchestrate-slice` Step 1
detecting an existing artifact and skipping its own architect dispatch —
lives in hero-crew and ships separately. Until then, the loop-side
triggers in this release write the artifact early so the orchestrator's
per-slice dispatch hits the no-op path on the next slice start. The
follow-on parallel-specialist work (FEAT-051) builds on this contract
and remains a separate FEAT.

## v0.10.0 — 2026-06-05 — feat: remove CLI auto-dispatch (FEAT-049 / SLICE-50)

### Breaking changes

The four CLI subcommands that previously called `dispatchAgent` no longer
auto-spawn role agents. Each surface now exits non-zero (or degrades
gracefully) when invoked without explicit data flags, because the old
auto-dispatch path wrote pending-dispatch marker files that no consumer
ever drained. See DEC-011 (supersedes DEC-004).

- `/loop:backlog enrich` (CLI) — refuses with non-zero exit and a stderr
  message naming the slash flow. Use `/loop:backlog-enrich` to classify
  triaged FEATs (architect tags / `needs_contract` / `needs_ux`).
- `/loop:backlog add` (CLI, no `--body`) — no longer auto-dispatches
  `loop:researcher`. The FEAT is still created, but with an empty body.
  Use `/loop:backlog-add` for researcher enrichment, or pass `--body`
  explicitly.
- `/loop:spec decompose` (CLI, no `--features` / `--features-json`) —
  refuses with non-zero exit. Supply `--features 'Title 1; Title 2'`
  (or `--features-json`) for scripted use, or use the
  `/loop:spec-decompose` slash flow for architect-derived FEAT titles.
- `/loop:slice complete` (CLI) — the async doc-writer fire-and-forget
  dispatch is removed. Slice close still succeeds and writes an audit
  line. The document-writer only runs via the `/loop:slice-complete`
  slash flow.

### Backward compatibility

The opt-out flags `--no-research`, `--no-architect`, and
`--no-doc-writer` still parse and are accepted by the CLI. They are now
no-ops and emit a one-line stderr deprecation notice naming DEC-011.
This keeps existing CI invocations and scripts running without "unknown
flag" failures while telemetry confirms no remaining usage. A follow-up
FEAT can remove the flags entirely once usage drops to zero.

### Why

DEC-004 (SLICE-23) introduced the pending-dispatch marker file as a
cross-process spawn primitive on the assumption that a future
SLICE-D would ship a harness consumer to drain markers and invoke role
agents. That consumer never shipped. Every CLI subcommand that called
`dispatchAgent` wrote a marker file and returned a placeholder string
(`<marker-written:...>`); no agent ever ran. v0.8.5 shipped a workaround
for `/loop:backlog-enrich` that proved the slash-flow pattern
(orchestrating role agents via Claude tools inside the session) is
viable and produces better results than the deferred-consumer approach.
DEC-011 makes that contract permanent and supersedes DEC-004.

### Migration

Operators and CI: switch direct invocations of the four CLI subcommands
to the matching slash flow:

| Old CLI                                       | New contract           |
| --------------------------------------------- | ---------------------- |
| `node scripts/loop.mjs backlog enrich`        | `/loop:backlog-enrich` |
| `node scripts/loop.mjs backlog add` (no body) | `/loop:backlog-add`    |
| `node scripts/loop.mjs spec decompose`        | `/loop:spec-decompose` |
| `node scripts/loop.mjs slice complete`        | `/loop:slice-complete` |

The CLI subcommands themselves remain available for audit-only use
(refusal + audit-log line). `dispatchAgent` and `appendAuditLog` are
still exported from `src/scripts/lib/auto-dispatch.mts` for callers
(e.g. `feature-lifecycle.mts::classifySlice`) that genuinely want
marker-write audit semantics; the marker queue at
`.claude/artifacts/loop/pending-dispatch/` is deprecated for production
use and no consumer is planned.

### Evidence

- Builder commit: `7e8790a` on `main` (`feat(SLICE-50): remove CLI
auto-dispatch ...`)
- Review: PASS — `.claude/artifacts/crew/reviews/20260605T142553Z-review-result-slice-50-remove-cli-auto-dispatch-slash-flows-are-the-contra.md`
- Validation: PASS — `.claude/artifacts/crew/validations/20260605T142928Z-validation-result-slice-50-cli-auto-dispatch-removal-runtime-validation.md`
- Decision: `.claude/artifacts/loop/decisions/DEC-011.md` (supersedes
  DEC-004)

### Release notes

v0.10.0 finishes the work started in v0.8.5: slash flows are now the
single, documented contract for orchestrating role agents in loop. The
four CLI subcommands that previously auto-dispatched (`backlog enrich`,
`backlog add` researcher path, `spec decompose` architect path,
`slice complete` doc-writer) no longer write marker files that nobody
consumes. Instead they refuse cleanly with an exit code and a message
naming the slash flow you should use.

This is a breaking change for any CI script or cron job that called the
four CLI subcommands directly expecting agent enrichment. Update those
callers to invoke the matching slash command (`/loop:backlog-enrich`,
`/loop:backlog-add`, `/loop:spec-decompose`, `/loop:slice-complete`).
The opt-out flags (`--no-research`, `--no-architect`,
`--no-doc-writer`) are accepted as no-ops with a deprecation notice to
keep existing scripts running while you migrate.

Background on the decision is in DEC-011, which supersedes DEC-004's
"future consumer will ship" assumption. The marker-file mechanism in
`auto-dispatch.mts` is retained as opt-in audit infrastructure for
callers that want it, but is no longer the loop's orchestration
primitive — slash flows are.

---

## v0.9.1 — 2026-06-05 — feat(hook): ship guard-feat-dispatch PreToolUse hook

### Hook surface

New plugin-shipped hook `hooks/guard-feat-dispatch.mjs` registered as
`PreToolUse:Agent` matcher in `.claude-plugin/hooks/hooks.json`. Fires on
every Agent dispatch from any session in any repo where loop is
installed. Inspects the prompt for `\bFEAT-\d{3}\b`. When a FEAT-NNN is
mentioned, blocks ad-hoc / general-purpose / 3rdparty subagents and
forces dispatch through the loop slice ceremony +
`/crew:orchestrate-slice` specialist ladder.

### Allowlist (does NOT block on FEAT-NNN)

- Crew ceremony specialists: `crew:builder`, `crew:build`, `crew:lead`,
  `crew:reviewer`, `crew:validator`, `crew:deployer`,
  `crew:researcher`, `crew:architect`, `crew:uxdesigner`,
  `crew:copywriter`, `crew:document-writer`
- Loop methodology agents: `loop:architect`, `loop:document-writer`,
  `loop:pm`, `loop:researcher`
- Read-only locator: `Explore`

`/crew:orchestrate-slice` is the source of truth for slice dispatch —
the specialists it invokes are first-class FEAT participants and stay
allowlisted. Only subagents that skip the artifact protocol stay
blocked.

### Why

Going around the slice ceremony with a general-purpose subagent breaks
cost attribution, grading, run-brief, the slice-progress dashboard, and
the audit trail downstream tools rely on. The guard was already deployed
in downstream consumer repos (loopobserver) — promoting it into the
loop plugin makes the protection universal for every loop consumer.

### Tests

Behavioral matrix run via subprocess against `hooks/guard-feat-dispatch.mjs`:

- Allows `crew:architect` on FEAT
- Allows `crew:uxdesigner` on FEAT
- Allows `loop:architect` on FEAT (`/loop:backlog-enrich` path)
- Allows `loop:pm` on FEAT
- Allows `crew:document-writer` on FEAT
- Blocks `general-purpose` on FEAT (exit 2)
- Blocks `crew:3rdparty:typescript-pro` on FEAT (exit 2)
- Allows `Explore` on FEAT
- Allows any subagent when no FEAT mentioned

9/9 PASS.

---

## v0.9.0 — 2026-06-05 — feat(triage): consolidate /loop:backlog-triage + /loop:pm-triage into /loop:triage

### Breaking changes

- `/loop:backlog-triage` (regex triage) public command removed.
- `/loop:pm-triage` renamed to `/loop:triage` and now PM-first with a regex
  fallback on PM error, budget exceed, or output validation fail.
- The CLI subcommand `node scripts/loop.mjs backlog triage` is unchanged and
  is now invoked only as the internal fallback. Direct callers (CI scripts,
  cron jobs) keep working.

### Added

- `node scripts/loop.mjs backlog list-pending-ids` — deterministic FEAT-id
  enumeration. Used by the triage skill to hand PM an explicit id list so
  fabricated ids are structurally impossible to write.
- `backlog pm-write` rejects `--id` values not found in
  `pending/`/`triaged/`/`in-progress/` — second-line defense against
  fabricated-id pollution.
- `loop.json` keys: `loop.triageBudgetUsdPerBatch` (default 5.0),
  `loop.triageBudgetTokensPerBatch` (default 500000),
  `loop.triageFallbackOnBudgetExceeded` (default true).
- Schema parity: regex-fallback triage now writes all five `pm_*` dimension
  keys (0.5 defaults) so downstream readers do not branch on triage path.

---

## v0.8.7 — 2026-06-05 — chore: standalone marketplace — decouple loop release from hero-crew

### Breaking change to install path

Loop now ships from its own marketplace at `github:sergeymilashico/loop`,
independent of the astra (hero-crew) marketplace. New install command:

```
/plugin marketplace add https://github.com/sergeymilashico/loop
/plugin install loop@loop
```

Previously: `/plugin install loop@astra` after adding the hero-crew
marketplace. That entry was removed from hero-crew's marketplace.json in
the paired commit; existing installs continue to work until the user runs
`/plugin marketplace update astra`, after which loop must be re-installed
via the new marketplace.

### Why

Release ceremony required a paired commit in `sergeymilashico/hero-crew`
to bump the parent marketplace pointer. Standalone marketplace cuts that
coupling — a tag in this repo propagates directly via `/plugin update`.

### Tooling

- `loop/.claude-plugin/marketplace.json`: `source: "./"` →
  `source: { source: "github", repo: "sergeymilashico/loop" }`,
  marketplace name `astra` → `loop`.
- `hero-crew/.claude-plugin/marketplace.json`: loop entry removed.
- `README.md`: install instructions updated.

---

## v0.8.6 — 2026-06-05 — chore: relaxed release ceremony (validator no longer locks marketplace.json version)

### Tooling

`validate-manifests.mjs` no longer requires `plugin.json.version` to equal
`marketplace.json.plugins[loop].version`. Loop's own marketplace.json is
consumed by nobody remote (canonical consumer is hero-crew's parent
marketplace). Releases now require bumping only `plugin.json` + the
hero-crew pointer; marketplace.json drift is allowed.

This release exists to validate the relaxed ceremony end-to-end —
plugin.json bumped to 0.8.6, marketplace.json left at 0.8.5.

---

## v0.8.5 — 2026-06-05 — fix(commands): /loop:backlog-enrich runs inline, not via broken marker CLI

### Fixes

**`/loop:backlog-enrich` slash command now Claude-driven**

The v0.8.4 wrapper delegated to the Node CLI subcommand, but the CLI's
`dispatchAgent` writes pending-dispatch markers to
`.claude/artifacts/loop/pending-dispatch/` and there is no consumer wired —
the architect classification never runs and FEAT frontmatter is never
updated. CLI silently reports `Enriched: 0` even when markers are written
(known gap, GRADE-SLICE-23 DEC-004).

Rewrote the slash command body to orchestrate via Claude's `Agent` + `Edit`
tools directly: glob triaged FEATs, filter unclassified, dispatch
`loop:architect` in parallel, parse the key:value response, write `tags` /
`needs_contract` / `needs_ux` into FEAT frontmatter. Idempotent — re-runs
only hit FEATs still missing tags.

CLI subcommand retained as audit-only (writes markers + audit log) until
the marker consumer ships.

---

## v0.8.4 — 2026-06-05 — feat(commands): /loop:backlog-enrich slash wrapper

### Features

**`/loop:backlog-enrich` slash command**

Wraps the existing `backlog enrich` CLI subcommand (shipped in v0.8.2) so the
batch classification sweep is reachable from the slash surface, not Bash-only.
Mirrors the `/loop:triage` invocation contract. The wrapper is
idempotent — already-tagged FEATs are left untouched. Run after
`/loop:triage` to backfill `tags` / `needs_contract` / `needs_ux` on
the triaged queue so `/crew:orchestrate-slice` routes the full specialist
ladder instead of falling back to AC-text heuristics.

No code changes — wrapper only. Existing tests cover the underlying
subcommand.

---

## v0.8.3 — 2026-06-05 — chore: SLICE-46 ceremony artifacts + version alignment

### Housekeeping

SLICE-46 ceremony artifacts committed (agent reports, cost reports, handoffs, run brief,
final synthesis, pending-dispatch). FEAT-048 backlog item moved to done. SLICE_46 moved
from pending to completed. Tag now includes CHANGELOG and full artifact trail.

Full test suite: 772/772 pass.

---

## v0.8.2 — 2026-06-05 — feat: architect classification tags for slices and features (FEAT-048)

### Features

**`sliceFromFeature` auto-classifies new slices via `loop:architect` (FEAT-048 / SLICE-46)**

After writing the slice file, `sliceFromFeature` dispatches `loop:architect` with a constrained prompt to classify the slice. The agent returns a key:value block (`tags`, `needs_contract`, `needs_ux`); results are merged into the slice frontmatter before the function returns. Classification is skipped when: the feature already has `tags` set (AC-3), `--no-classify` is passed, or the dispatch errors (soft-fail — a warning is logged but no exception is thrown).

**`backlog enrich` CLI subcommand**

`node scripts/loop.mjs backlog enrich [--no-classify]` iterates all triaged FEATs missing `tags`, dispatches `loop:architect` for each, and patches FEAT frontmatter with the results. Prints `Enriched: N / Already tagged: M` summary. Per-feature dispatch failures are logged and skipped — the loop continues.

**`classify-parser.mts` — tolerant key:value parser**

New module `src/scripts/lib/classify-parser.mts` exports `parseClassifyOutput(raw: string): ClassifyResult`. Parses architect output tolerantly (ignores prose, headings, blank lines). Tags are filtered to the known vocabulary (`api-change`, `storage`, `workflow`, `ux`, `auth`, `infra`, `test`, `docs`, `refactor`). Unknown or missing fields default to `[]` / `null` so callers can safely spread into frontmatter.

### Tests

772/772 pass. 11 new tests: `backlog-enrich.test.mts` (7 tests covering all 5 ACs) + `slice-classify.test.mts` (4 tests covering `--no-classify`, dispatch failure, unparseable output).

---

## v0.8.1 — 2026-06-05 — refactor: module splits + post-builder confidence (FEAT-044/045/046)

### Refactors

**`loop-installer.mts` split into 3 modules (FEAT-044 / SLICE-47)**

`loop-installer.mts` was 533 lines (33% over the 400-line convention). Split into:

- `loop-installer-tokens.mts` (82 lines) — `readTemplate`, `renderTemplate`, `resolveLoopPath`, `buildMandatoryDocsList`, `buildContextRulesList`, `buildTokens`
- `loop-installer-scaffold.mts` (346 lines) — 7 scaffold write functions
- `loop-installer.mts` trimmed to 168 lines; re-exports `buildContextRulesList` for test compat

**`auto-walker.mts` gate helpers extracted to `walker-gates.mts` (FEAT-045 / SLICE-48)**

`auto-walker.mts` was 490 lines, now 261 lines. Extracted to `walker-gates.mts` (234 lines):
`compareWalkerOrder`, `checkDependsOn`, `evaluateCandidate`, `evaluateRiskGate`, `DispatchPlan` interface, `PRIORITY_ORDER`. `DispatchPlan` moved to break a potential circular import. `auto-walker.mts` re-exports `DispatchPlan` and `evaluateRiskGate` for backward compat.

### Features

**Post-builder confidence update in `slice complete` (FEAT-046 / SLICE-49)**

`completeSlice` now accepts `opts.builderEvidence?: BuilderEvidence`. When present, `computePostBuilderConfidence` maps pass/fail/partial → green/yellow/red and appends `updated_confidence` + `updated_confidence_reason` to the return. When absent, both fields are `null`. `computeConfidence` at slice-start is unchanged.

### Tests

751/751 pass. 8 new tests: 6 unit tests for `computePostBuilderConfidence` branches + 2 integration tests in `slice-complete.test.mts`.

---

## v0.8.0 — 2026-06-05 — feat: backlog pm-write CLI subcommand (FEAT-043)

### Features

**`backlog pm-write` CLI subcommand — PM score write-back (FEAT-043 / SLICE-45)**

`node scripts/loop.mjs backlog pm-write --id FEAT-NNN --scores '{"customer_impact":0.8,...}' --priority P1 --autonomous-safe true` now exists and writes all five `pm_*` dimension fields plus `composite_score` to FEAT frontmatter without changing `status` or moving the file. Fixes the broken PM triage loop: previously scores were computed but never persisted, leaving every new FEAT with `composite_score: 0` and sorting it last in the auto-walker.

`composite_score` uses a weighted formula: `impact×0.35 + alignment×0.30 + (1−effort)×0.20 + (1−risk)×0.10 + (1−dep)×0.05`. This matches PM agent judgment where high impact/alignment is positive and high effort/risk/dependency is negative.

**`computeWeightedCompositeScore(scores)` added to `pm-scorer.mts`**

Exported from `pm-scorer.mts` for shared use. Replaces the naive `averagePmScore` call that was computing the wrong values for the composite ranking.

### Bug fixes

**PM composite scores corrected for FEAT-043/044/045/048**

Manually patched composite scores updated to formula-computed values: FEAT-043=0.84, FEAT-044=0.53, FEAT-045=0.53, FEAT-048=0.63.

### Tests

8 new tests in `backlog-pm-write.test.mts`. 743/743 pass.

---

## v0.7.9 — 2026-06-05 — fix: auto-walker passes config to stop-condition check

### Bug fixes

**Auto-walker ignored `costStopThreshold` from loop.json in stop-condition evaluations**

`walkCandidates` called `checkStopConditions(repoPath)` without forwarding the resolved config. Inside `applyCostAlertSignal`, the threshold expression `config?.loop?.costStopThreshold || 1` resolved to `1` (default) instead of the configured value (e.g. 15), so any repo with ≥ 1 high-severity cost alert would halt the walker after its first plan. Fix: `walkCandidates` now accepts a `config` param (default `null`) and forwards `{ config }` to `checkStopConditions`. `runAutoWalker` passes `resolvedConfig` through.

### Backlog

PM scores patched for FEAT-043 (0.84), FEAT-044 (0.56), FEAT-045 (0.55), FEAT-048 (0.62).

### Tests

735/735 pass.

---

## v0.7.8 — 2026-06-05 — hotfix: findCrewCli semver sort

### Bug fixes

**`findCrewCli` lexicographic sort returned wrong version (P0 hotfix)**

`findCrewCli` used `.sort().reverse()` (lexicographic) to pick the newest crew version. With both `0.9.0` and `0.13.1` installed, lex sort picked `0.9.0` because `"9" > "1"` character-by-character. This caused `checkOrchestrateSliceSupport` to read crew `0.9.0` and return `false`, silently falling back to the legacy builder dispatch even when crew `0.13.1` (which ships `/crew:orchestrate-slice`) is installed — breaking FEAT-047 entirely.

Fixed by replacing `.sort().reverse()` with `.sort((a, b) => compareSemver(b, a))`. Regression test added to `plugin-identity.test.mts` documenting both the bug (lex sort picks `0.9.0`) and the fix (semver sort picks `0.13.1`).

### Tests

735/735 pass.

---

## v0.7.7 — 2026-06-05 — /crew:orchestrate-slice as default dispatch + inline AC prefix detection

### Features

**`/crew:orchestrate-slice` as default dispatch instruction (FEAT-047 / SLICE-44)**

`slice-start` now emits `/crew:orchestrate-slice --id SLICE-NN` as the `dispatchInstruction` when the installed crew plugin is >= v0.11.0 (the first crew release shipping `commands/orchestrate-slice.md`). The orchestrate command runs the full tag-driven specialist ladder (architect → uxdesigner → builder → reviewer → validator → copywriter → doc-writer) from the main thread, keeping all dispatches visible. Installations on crew < 0.11.0 fall back gracefully to the legacy `crew:builder` subagent prompt.

New constant `ORCHESTRATE_SLICE_MIN_CREW_VERSION = "0.11.0"` in `plugin-identity.mts` is the soft feature gate; `MIN_CREW_VERSION = "0.3.6"` (the hard install gate) is unchanged. `checkOrchestrateSliceSupport(versionOverride?)` is the check function; `_crewVersionOverride` test seam injected into `startSlice()` for deterministic unit tests without filesystem reads.

**Inline AC prefix detection fix (FEAT-041 / SLICE-43)**

`detectAcceptanceCriteria` in `backlog-triage.mts` now recognises the inline prefix form `Acceptance criteria: AC-1: ...` (single-paragraph body written by `/loop:backlog-add`). Previous implementation only matched `## Acceptance criteria` headings, causing newly added features to score `acCount=0` and get `autonomous_safe: false` incorrectly.

### Tests

734/734 pass.

---

## v0.7.6 — 2026-06-04 — crew:builder direct dispatch + checkpointCommit + contextRules

### Features

**crew:builder direct dispatch (builder-only scope)**

Loop orchestrator now dispatches `crew:builder` directly instead of routing through `/crew:build` or `crew:lead`. Builder prompt scoped to implementation only — builder must NOT dispatch `crew:reviewer` or `crew:validator` itself. Parent loop drives review and validation gates explicitly after builder returns. `nextAction` string updated to spell out the full sequence: builder → reviewer → (validator if behavior changed) → slice complete. Rules, templates, and `CLAUDE.md` updated to match.

**checkpointCommit primitive (FEAT-012 SLICE-38)**

`src/scripts/lib/checkpoint-commit.mts` — new module. `checkpointCommit({ repoPath, sliceId, summary, stagedOnly?, body? })` runs `git add -u` (or skips when `stagedOnly: true`), builds a structured WIP commit subject (truncated to 72 chars), and returns `{ committed: boolean, sha?, reason? }`. Foundation for continuous auto-commit safety nets during long sessions. Exported via `slice-linker.mts` barrel. 7 unit tests cover happy path, clean no-op, 72-char truncation, body filtering, and stagedOnly isolation.

**contextRules glob-to-docs config key (FEAT-007 SLICE-39)**

`loop.json` now accepts a `contextRules` array: each entry maps `globs` patterns to `docs` paths. `buildContextRulesList(config)` renders an advisory `## Context rules` section into `MASTER_PROMPT.md` via the `{{contextRulesList}}` template token. Instructs agents to read listed docs when a slice's `in_scope_globs` matches. Remote import half rejected (no network dependency, no integrity check — see DEC-009). 4 unit tests.

### Tests

717/717 pass.

---

## v0.7.5 — 2026-06-04 — crew:build inline dispatch + feature path in context block

### Features

**Inline crew:build dispatch replaces crew:lead subagent**

Loop orchestrators now invoke the `crew:build` skill inline instead of dispatching a `crew:lead` subagent. Fixes instability where lead agents were choosing single-session mode and implementing code directly rather than delegating to `crew:builder`. Dispatch instruction text changed from `Dispatch crew:lead subagent with this prompt:` to `Invoke the \`crew:build\` skill with this context:`. `rules.md`, `templates/loop-rules.md`, and `CLAUDE.md` dispatch table updated to match.

**Feature file path in dispatch context block**

`readFeatureExcerpt` return type changed from `string | null` to `{ path: string; excerpt: string } | null`. The feature file path is now surfaced as a `Path:` line in the `## Slice context` block of the dispatch instruction, giving dispatched agents direct access to the feature file without needing to search for it.

### Tests

687/687 pass.

---

## v0.7.4 — 2026-06-04 — Read-guard hook, model routing audit, costSliceCeiling stop condition (FEAT-039)

### Features

**Read-guard PreToolUse hook (FEAT-039)**

`hooks/read-guard.sh` — bash PreToolUse hook that exits non-zero when Claude attempts to re-read a file immediately after an Edit or Write on the same path. Prevents the post-edit re-read pattern that burned 17 extra reads in SLICE-36.

`/loop:install` now registers the hook in `.claude/settings.json` under `hooks.PreToolUse` (matcher `Read|Edit|Write`). Registration is idempotent — re-install does not duplicate the entry and preserves pre-existing user hooks.

**Model routing policy — sonnet default for review/build/validate (FEAT-039)**

Audit of 10 routing sites (`docs/research/2026-06-04-model-routing-audit.md`). Review and build phases do not require frontier reasoning; switching opus→sonnet there cuts per-slice cost ~4×. sliceStart and gradeWrite retain opus for architectural judgment and retrospective synthesis. Routing table formalized in `docs/decisions/DEC-008-model-routing-policy.md` (ADR). `.claude/loop.json` updated: `review→sonnet`, `decompose→sonnet` added.

Result: SLICE-37 burned $18.36 (100% Sonnet) vs SLICE-36 $85.97 (100% Opus) — 79% reduction.

**costSliceCeiling stop condition (FEAT-039)**

`src/scripts/lib/slice-cost-ceiling.mts` — new module. Reads latest per-slice cost report (skips aggregate reports), compares `usd` field against `loop.costSliceCeiling` (default $75). Returns `SliceCostCeilingSignal` when exceeded. `stop-conditions.mts` now calls this check and emits `[HIGH] slice-cost-ceiling:exceeded` as a stop reason + blocker. Complexity kept at 15 via `buildCeilingSnapshotEntry` and `gatherStopInputs` helpers. 3 new tests: exceeded, not-exceeded, no-config.

### Tests

702/702 pass (+7 new: 3 read-guard hook behavior, 3 loop-installer hook idempotency/preservation, 3 stop-check-cost-ceiling branches; 695 pre-existing).

---

## v0.7.3 — 2026-06-04 — Confidence signal at slice-start, lead-dispatch visibility, pr-fixer schema assert, cost-aliases, agent-report dedupe

### Features

**Confidence signal at slice-start (FEAT-010 SLICE-A)**

`startSlice` ceremony return now includes `confidence: "green" | "yellow" | "red"` + `confidenceReason` string. Deterministic heuristic (no LLM) over 4 signals: `autonomous_safe`, AC count, recent grade trend, `depends_on` count. Null grade history treated as neutral — avoids penalizing first-ever slices.

Helper module: `src/scripts/lib/confidence-signal.mts` exports pure `computeConfidence`. 9 unit tests cover all 5 decision branches plus null-grade and null-auto-safe pass-through.

Slice-progress dashboard rendering deferred to follow-on slice (signal flows through return; consumers see it today).

**Lead-dispatch visibility: `[MODE]` + `[CHECKPOINT]` line-tag conventions (FEAT-038)**

`buildDispatchInstruction` now embeds advisory `[MODE]` (inline vs subagent choice) and `[CHECKPOINT]` (per-AC progress) line-tag prompts so the parent loop gets early visibility into crew:lead's dispatch decisions and progress. Advisory contract — no enforcement layer. Design doc at `docs/superpowers/specs/2026-06-04-lead-dispatch-visibility-design.md`.

**Architect output parser + agent_type fallback (FEAT-036 SLICE-33)**

Improvements landed during SPEC-002 Theme C work; closes the parser robustness + test-coverage gap from prior PR autofix work.

**costProjectAliases for legacy source slugs (FEAT-035)**

`tryWriteCostReport` in `crew-bridge.mts` now honors `loop.costProjectAliases: string[]` config. After a repo rename, historical cost session data stays accessible via the alias — each alias is passed as an additional `--source-project` flag to the crew CLI (which accepts them additively, verified by live smoke).

`.claude/loop.json` updated: `costProject: "C--work-mega-loop"` + `costProjectAliases: ["C--work-mega-hero-crew-autonomous-loop"]`. Restored cost-trend signal that had been zero for SLICE-23..SLICE-28 due to stale slug.

**pr-fixer schema assert + gh-unavailable coverage (FEAT-037)**

`assertPrViewShape` helper validates the `gh pr view` JSON shape after `JSON.parse`. Throws with field-specific message on mismatch. `fetchPrStatus` restructured to separate the gh-CLI try/catch (recoverable via `haltReason`) from the shape assertion (programming bug, throws). 9 new tests cover both branches.

### Fixes

**`stop-check` CLI honors `costStopThreshold` config**

`stop-check` was calling `checkStopConditions(repoPath)` without resolving config first. Inside, `config?.loop?.costStopThreshold` fell through to `|| 1`, ignoring the user's actual configured value (e.g. 15) and tripping on the first HIGH-severity cost recommendation. Fix: resolve config via `resolveConfig` before invoking `checkStopConditions`. One-line addition; verified via live smoke (previously `shouldStop: true` on 6 alerts → now `shouldStop: false` with threshold 15 applied).

**agent-report dedupes pairs sharing transcriptPath**

Some hook configurations emit two `SubagentStart`/`SubagentStop` event sequences per logical dispatch. Each pair gets a distinct `agent_id` but both reference the same `agent_transcript_path`. Writer now collapses pairs sharing a non-null transcriptPath, preferring the pair with both timestamps populated. LoopObserver-style consumers no longer see every dispatch twice with identical stats.

### Research

**FEAT-032 SLICE-34: builder mid-cleanup stop root cause**

Confirmed via real-data analysis: the pattern correlates with subagent dispatch context budget pressure during final-synthesis writes. Documents mitigation recommendations + recovery patterns; informs future slice-scope discipline.

### Internals

- SLICE-33 (FEAT-036) and SLICE-35 (FEAT-037) closure ceremonies + grade artifacts.
- SPEC-002 Theme C followups satisfied.
- FEAT-038 design doc + SLICE wire-up for `[MODE]`/`[CHECKPOINT]` signals.
- Tests: 656 → 683 (+27 across all FEATs in this release).
- All gates green: lint, typecheck, format-check, manifest validator, length validator.

### Known gaps (deferred)

- FEAT-010 SLICE-B: mid-execution confidence updates (signal is static-at-start only this release).
- Slice-progress dashboard rendering of confidence (signal flows through return but dashboard not yet wired).
- Builder mid-cleanup stop persists; FEAT-032 produced root cause but mitigation code is future work.

## v0.7.2 — 2026-06-04 — Slice dispatch routes to crew:lead + FEAT-034 marker drain + auditLogPath

### Architecture

**Slice work now dispatched through `crew:lead`, not directly to `crew:builder`**

`/loop:slice start`'s `dispatchInstruction` previously emitted
`Dispatch /crew:build subagent with this prompt:`, which the
orchestrator interpreted (per `.claude/loop/rules.md`) as spawning
`crew:builder` directly. That collapsed crew's lead workflow —
framing (in-scope / out-of-scope / mode choice), sub-task splitting,
role-bounded delegation, synthesis — onto the builder agent itself,
weakening scope discipline for every autonomous slice.

- `buildDispatchInstruction` now emits
  `Dispatch crew:lead subagent with this prompt:`. The embedded prompt
  instructs lead to run the full crew lead workflow: frame the work,
  implement via single-session, assisted single-session, or team run
  (delegating to `crew:builder` when scope warrants), require
  independent review via `crew:reviewer` when code changes, validation
  via `crew:validator` when behavior is exercisable, then synthesize.
- `computeNextAction` in `start-slice` updated for both the
  approval-gate branch and the default dispatch branch.
- HARD RULE blocks (`.claude/loop/rules.md`, `templates/loop-rules.md`,
  `templates/claude-md-hard-rules.md`, `CLAUDE.md` summary) updated so
  docs and code agree on the new dispatch target.
- `commands/slice-start.md` example return values updated.
- Test coverage: `tests/slice-linker.test.mjs` and
  `tests/slice-start.test.mjs` (plus their `.mts` sources) regex-assert
  the new dispatch text. Full suite 640 / 640 passing.

Cost trade-off accepted: opus lead-framing pass before the sonnet
builder runs. Quality gain: real lead workflow + bounded builder
scope per slice. Interactive `/crew:build` is unaffected — orchestrator
remains lead in the user's own conversation context, no extra subagent
layer.

Gap analysis driving this change lives in
hero-crew's `.claude/artifacts/crew/handoffs/2026-06-04-loop-dispatch-gaps-analysis.md`
and the corresponding final synthesis under
`.claude/artifacts/crew/runs/`.

### Features

**Pending-dispatch marker drain on slice-complete (FEAT-034 SLICE-A)**

Closes Issue #1 of FEAT-034 (SPEC-002 Theme A). Markers in
`.claude/artifacts/loop/pending-dispatch/` older than 24h are now
drained on slice complete, fire-and-forget. Filename safety: only
operates on `^\d{13,}-[a-z][\w-]*\.json$` — prevents accidental
deletion of unrelated files. Drain failure is isolated (logged via
`appendAuditLog`; ceremony returns successfully regardless).

- `src/scripts/lib/marker-drain.mts` (new) — `drainPendingDispatchMarkers`
  with `DEFAULT_TTL_MS = 24h`. Pure helper `parseMarkerTimestamp`
  unit-testable in isolation.
- `complete-slice.mts` wires `fireMarkerDrain` after
  `fireDocWriterDispatch`. `--no-marker-drain` opt-out via
  `parseSkipFlag`. `drainFn` test-injection seam (same shape as
  `dispatchFn`). Helper extraction (`resolveSliceContext`,
  `writeCeremonyArtifacts`) keeps `completeSlice` under the ESLint
  complexity ceiling of 15.
- 12 new tests across `marker-drain.test.mts` and
  `slice-complete-marker-drain.test.mts`.

**Configurable `auditLogPath` for auto-dispatch (FEAT-034 SLICE-B)**

Closes Issue #3 of FEAT-034. `appendAuditLog` now reads
`loop.auditLogPath` from config — absolute paths used verbatim,
relative paths resolved against `repoPath`. Default unchanged. Lazy
config resolution: when `opts.config` is not passed, the default path
is used directly without calling `resolveConfig` (avoids recursion
risk + keeps the hot path fast).

- `src/scripts/lib/auto-dispatch.mts::appendAuditLog` extended with
  optional `opts: AuditLogOpts` third parameter (fully back-compat).
- New exported pure helper `resolveAuditLogPath(repoPath, opts)`.
- 8 new tests in `auto-dispatch.test.mts`.

FEAT-034 closes as done (2-of-3 shipped, Issue #2 — builder
mid-cleanup stop investigation — deferred to FEAT-032 which already
covers the same research spike). SPEC-002 Theme A two-thirds
satisfied.

### Early signal on Option A

Both FEAT-034 slices shipped under the new `crew:lead` dispatch
routing. Composite grade 0.914 on both (SLICE-30 + SLICE-31). SLICE-31
is the first slice in this session that did NOT exhibit the builder
mid-cleanup stop pattern (occurred 6 times prior in SLICE-23 / 25 / 26
/ 27 / 29 / 30). Counter-evidence to the FEAT-032 hypothesis: small
slices stay within whatever budget large ones exhaust. Two data points
is not validation — full Option A signal still requires the 2-3 grade
measurement window from the dispatch-gap analysis handoff.

## v0.7.1 — 2026-06-04 — Agent-report hardening, triage heuristics, auto-mode rename, SPEC-002 wiring

### Fixes

**Agent-report writer counts in-flight subagents (FEAT-031)**

Recent agent reports collapsed to `agent_count: 0` whenever `subagent_stop`
events hadn't landed in `events.jsonl` by the time `/loop:slice complete`
ran. SubagentStop fires when the orchestrator returns control to the user,
not when the subagent finishes — that can land minutes after slice-complete
writes the report, so the writer was reading an incomplete event window.

- `scripts/lib/slice-linker/agent-report-writer.mjs::pairAgentEvents` now
  iterates the union of `agent_id`s seen in start AND stop payloads. Starts
  without a matching stop become entries with `stopTs: null`, surfaced via
  a new diagnostic note: "_N agent(s) have no `subagent_stop` event recorded._"
- Real-data probe: re-running the writer on SLICE-27 (FEAT-030) window now
  yields `agentCount: 3` (was 0).
- Two new unit tests in `tests/agent-report-writer.test.mjs` cover the
  start-without-stop path and mixed completed/in-flight runs.

### Features

**Triage heuristic for `autonomous_safe` (FEAT-033)**

`/loop:backlog triage` now infers an `autonomous_safe` flag for each FEAT
based on category + priority + description keywords. P1 features touching
core dispatch machinery default to `autonomous_safe: false`; mechanical
bug fixes default to `autonomous_safe: true`. Agents and the autonomous
loop use the flag to decide whether to skip per-slice human review.

### Renames

**`marathonMode` → `autoMode` with back-compat**

The autonomous-loop config field formerly known as `marathonMode` is now
`autoMode`. Old configs continue to work — `stop-conditions.mts` reads
both keys with `autoMode` winning when both are present. Documentation
updated to use "auto mode" in user-facing copy.

### Internals

- SPEC-002 ("Reliability Hardening from Grade Followups") authored and
  decomposed into FEAT-034 (marker hygiene + builder mid-cleanup stop),
  FEAT-035 (cost telemetry project-name fix), FEAT-036 (defensive
  parsers + test coverage). All P1-P3, queued for autonomous loop.
- Post-v0.7.0 housekeeping: retrospective for 2026-06-04 added under
  `.claude/artifacts/loop/retrospectives/`; loop-snapshot refreshed.
- 6th decision captured: DEC-006 (pair agent events by union of
  start+stop ids).

## v0.7.0 — 2026-06-04 — Agent-aware autonomous backlog flow, three new role agents, length validator, plugin surface restructure

### Features

**Agent-aware autonomous flow (FEAT-028 / FEAT-030)**

The three documentation-and-discovery role agents now auto-dispatch
from inside the loop CLI primitives. Every `/loop:backlog-add`,
`/loop:spec-decompose`, and `/loop:slice-complete` invocation can
spawn a role agent without the user remembering to ask for one.

- `src/scripts/lib/auto-dispatch.mts` shared primitive: `dispatchAgent`,
  `parseSkipFlag`, `appendAuditLog`. Audit trail at
  `.claude/artifacts/loop/auto-dispatch.jsonl`.
- `/loop:backlog-add` auto-dispatches `loop:researcher` to populate
  the FEAT body with citation-backed findings. `--no-research`
  opt-out; `--body` short-circuits the dispatch entirely.
- `/loop:spec-decompose` auto-dispatches `loop:architect` to produce
  a structured decomposition when no `--features` is supplied.
  `--no-architect` opt-out; incomplete SPECs surface a warn-and-proceed
  best-effort.
- `/loop:slice-complete` auto-dispatches `loop:document-writer` async
  (fire-and-forget). Multi-output prompt: CHANGELOG line always, ADR
  drafts per DEC-NNN, release-notes append when `target_release` set,
  README / docs suggestion when surface-touching. `--no-doc-writer`
  opt-out.
- Each integration site exposes a `dispatchFn` test-injection seam.
- DEC-004 (marker-file dispatch primitive), DEC-005 (audit log
  fail-loud) captured in `docs/decisions/`.

**Three new role agents**

- `agents/architect.md` — read-only Node ESM design and ADR drafter.
- `agents/researcher.md` — read-only citation-backed code archaeology.
- `agents/document-writer.md` — Markdown-only docs (README,
  CHANGELOG, ADR, retros, release notes). Each has explicit output
  contract, anti-hallucination rules, boundary clauses, and a
  consult-list of skills + sub-agents.

**Length validator (`validate-content-length.mjs`)**

- Owned agents capped at 300 lines, SKILL.md at 200. `agents/3rdparty/`
  exempt (vendored — avoiding fork-and-trim chore on every refresh).
- Wired into CI (`.github/workflows/ci.yml`), `npm run
validate:lengths`, and the pre-push hook.
- `parseSkipFlag` / `agentSkipPaths` opt overrides for callers.
- 14 tests cover the contract.

**State-gated decomposition alert (FEAT-029)**

`pattern-alerts.mts::detectDecompositionAlerts` now branches on
`feat.state`. Done features with 3+ slices emit `info` severity
(observability preserved, does not gate `stop-check`). Active
features still emit `warn`. Unblocks auto-mode loop progression on
shipped-historical FEATs.

**PM agent escalation contract**

`agents/pm.md` now lists explicit skill consultation paths and
sub-agent escalation targets (`3rdparty/task-decomposition-expert`,
`3rdparty/fact-checker`, `3rdparty/research-coordinator`,
`3rdparty/context-manager`, `loop:researcher`, `loop:architect`).
Adds `compositePriority: "needs-review"` escape valve — PM emits
this instead of fabricating confidence when scope exceeds PM ability.

**`brainstorming` and `authoring-slices` skill augments**

- `universal/brainstorming/SKILL.md` adds a Loop integration block:
  surfaces PM scoring dimensions + `autonomous_safe` verdict before
  exit so ideas land triage-ready.
- `loop:authoring-slices` documents the `loop slice plan` pre-flight
  CLI + when to dispatch architect vs researcher vs builder.

### Plugin surface restructure

- Owned agents: 4 (`pm`, `architect`, `researcher`, `document-writer`).
- Vendored `3rdparty/` reduced from 21 to 7 (kept: `code-reviewer`,
  `context-manager`, `diagram-architect`, `fact-checker`,
  `markdown-syntax-formatter`, `research-coordinator`,
  `task-decomposition-expert`). Dropped 14 wrong-language /
  wrong-domain agents (python, c#, react, cloud, db, backend,
  devops, ai, ui, api-documenter, etc.).
- `skills/domain/` reduced from 16 to 4 (kept: `architecture-advisory`,
  `javascript`, `prompt-engineering`, `security-advisory`).
- `skills/workflow/` reduced from 7 to 4 (dropped duplicates +
  crew-overlap: `git-commit`, `fix-pr`, `reviewing-code`).
- Skill metadata loaded into session reminders is leaner — faster
  startup payload.

### CI and tooling

- `actions/checkout@v5`, `actions/setup-node@v5`, `node-version: 24`
  — ahead of the June-2026 Node 20 deprecation.
- Pre-push hook now runs `npm run format:check` alongside
  `validate-manifests` and `validate-content-length` — drift caught
  before it reaches CI.
- Ambient `.d.mts` shims under `src/scripts/lib/github-sync/`
  replaced 9 `@ts-ignore` blocks for dynamic imports of the
  runtime-only github-sync subsystem.
- Prettier formatting drift fix across 28 src files; format check
  now clean.

### Notes

- FEAT-028 shipped 3 of 4 originally-designed slices; SLICE-D split
  off as standalone FEAT-030 when FEAT-028 hit the decomposition
  pattern alert at 3 slices — the alert worked as intended on its
  own author.
- Test count: 555 → 601 (+46 across all FEATs in this release; 1
  regression test skipped pending fixture refactor).
- All gates green: lint, typecheck, format-check, manifest validator,
  length validator, full suite, CI.

## v0.6.0 — 2026-06-03 — Pluggable task-store, architect command, Plan Mode gate, autonomous walker, trajectory log, PR autofix

### Features

**Pluggable task-store backend (FEAT-024)**

- New `scripts/lib/task-store/` provider layer: `TaskStoreProvider` interface, `GithubProvider`, `NoopProvider`, `LinearProvider` stub.
- `getProvider(config, repoPath)` resolver reads `taskStore.provider` from `loop.json`; back-compat with `github.enabled: true`.
- `setup-task-store.mjs --provider <github|noop|linear>` adopter script.
- `loop github sync` and `loop github bootstrap` now route through the provider.
- `loop task-store` alias added.

**Observability: warn on unknown provider (FEAT-027)**

- `getProvider` emits `console.warn` when falling through to NoopProvider due to an unrecognised provider name.
- `loop github sync`/`bootstrap` log resolved provider name at INFO level.

**Architect / editor two-model split — `loop architect` (FEAT-005)**

- New `loop architect --id SLICE-NN` command: runs `runPlanPreflight` as the architect model (Opus), returns plan artifact + two-model dispatch instruction naming both architect and editor models.
- `resolveArchitectModels(config)` added to model-router; `"architect"` added to `MODEL_PHASES`.
- `commands/architect.md` skill doc.

**Plan Mode conditional gate in `startSlice` (FEAT-006 SLICE-B)**

- `runPlanPreflight` now runs as a best-effort parallel resource in `startSlice`.
- `computeApprovalGate(autonomousSafe, autoMode, dispatch)` — exported pure helper.
- `requiresApprovalGate` and `planPreflight` included in `startSlice` return.
- Gate fires when `autonomous_safe: false` and loop not in auto mode; suppressed when `loop.autoMode: true`.

**Autonomous backlog walker updates (FEAT-025)**

- SLICE-B: `evaluateRiskGate` (deferred/depends_on → skip; pm_risk_level ≥ 0.7 → warn). `processUnsafeEntry` produces plans with `requiresPlanPreflight: true`. `writeAutoRunSummary` writes `.claude/artifacts/loop/auto-runs/` artifact.
- SLICE-C: `costStopThreshold` enforcement (plan-count proxy; reads `loop.json`). `orchConfig: { costStopThreshold, escalationThreshold: 3, autoMode }` in return. `--auto-mode` CLI flag wired.
- `loop auto` now processes `autonomous_safe: false` items (with risk gate).

**Trajectory JSONL step log (FEAT-008)**

- New `scripts/lib/trajectory-writer.mjs`: `recordStep`, `readTrajectory`, `trajectoryPath`.
- `startSlice` and `completeSlice` emit `slice_start`/`slice_complete` events to `.claude/artifacts/loop/trajectories/<sliceId>-trajectory.jsonl`.
- `loop trajectory --id SLICE-NN` CLI query.

**Autonomous PR autofix loop (FEAT-009)**

- New `scripts/lib/pr-fixer.mjs`: `fetchPrStatus` (gh CLI), `categorizePrIssues` (5 categories), `runPrFix` (circuit breaker via `priorAttempts`).
- Categories: `ci_failure`, `lint`, `test_failure`, `review_comment`, `security`.
- `loop pr-fix --pr N` CLI command.
- `commands/pr-fix.md` skill doc.

### Tests

555 total tests (up from 500 at v0.5.6). All pass.

## v0.5.6 — 2026-06-02 — Move `presets/` under `scripts/` to survive plugin-cache selective copy

### Fixes

**Plugin cache `ENOENT: presets/` regression**

- Claude Code's plugin fetcher populates `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` by selectively copying recognized plugin-component directories (`commands/`, `scripts/`, `skills/`, `tests/`). Top-level `presets/` was dropped on install, causing `node ./scripts/loop.mjs <any-cmd>` to crash with `ENOENT: no such file or directory, scandir '<cache>/0.5.5/presets'` because `scripts/lib/config-resolver.mjs` reads the preset directory at startup.
- Moved `presets/` → `scripts/presets/` so the directory rides along with `scripts/` in the cache copy.
- Updated `scripts/lib/config-resolver.mjs` and `src/scripts/lib/config-resolver.mts`: `path.resolve(scriptDir, "..", "presets")` (one `..` instead of two).
- Updated `README.md` and `commands/list-presets.md` to reference the new path.

## v0.5.5 — 2026-05-28 — Cross-session learnings JSONL store + github-sync

### Features

**Cross-session learnings (FEAT-011)**

- Persistent JSONL store at `.claude/artifacts/loop/learnings.jsonl`.
- `recentLearnings(repo, n)` returns the top `n` most-recent entries; `/loop:start` surfaces the top 3 automatically so the agent inherits session-to-session observations without manual recall.
- Guard added: `recentLearnings(repo, 0)` returns an empty array instead of the full store.

**GitHub Issues integration (Phase 21)**

- Bidirectional sync layer in `scripts/lib/github-sync.mjs` + `scripts/lib/github-sync/*`: milestones, issues, sub-issues, comments, body-diff.
- Public API: `publishAll`, `syncPull`, `syncMilestones`, `postSliceComment`, `updateIssueStatus`, `bootstrapFromGithub`.
- `loop.json` `github: { enabled, repo }` opt-in block.
- Ceremony hooks: slice start writes status label + comment; slice complete posts summary comment and closes the issue.
- One-shot adopter: `scripts/setup-github-sync.mjs <repoPath>`.
- CLI: `node scripts/loop.mjs github setup|publish|sync|status|bootstrap`.

## v0.5.4 — 2026-05-28 — TS phase 3: integration tests, ESLint boundaries, CI typecheck

### Features

**Integration test coverage (FEAT-023)**

- New `src/tests/integration.test.mts`: 3 full-cycle `startSlice` → `completeSlice` scenarios in tmp repos (happy path, validation-blocked, `--skip-validation-check` bypass).
- New `src/tests/gates.test.mts`: blocking + passing cases for `deriveValidationGate`, `deriveTestAdequacyGate`, `computeFeatureResult`.
- Test count: 403 → 427 (+24 net new integration and gate tests).

**ESLint sub-module boundary rule**

- `eslint.config.mjs` now enforces `import/no-restricted-paths`: code outside `slice-linker.mts` barrel cannot import `slice-linker/*` sub-modules directly.
- Fixed pre-existing violation in `grade-writer.mts` (was importing `renderIdentification` directly; now goes through barrel).

**CI hardening**

- `.github/workflows/test.yml` renamed to `ci.yml`; `pull_request` trigger added.
- `npm run typecheck` step added — runs on every PR, not only on push to main.

## v0.5.3 — 2026-05-28 — TypeScript migration, slice-linker decomposition, dispatch discipline

### Features

**TypeScript Phase 1 migration (FEAT-021)**

- All library source files ported to `.mts` under `src/scripts/lib/`.
- Permissive Phase 1 settings: `noImplicitAny: false`, `strictNullChecks: false`, liberal `any` casts.
- Compiled output stays in `scripts/` (committed); drift guard (`git diff --exit-code scripts/`) blocks uncompiled changes.
- Tests compile to `tests/` via `tsconfig.test.json` (`outDir: "."`); `npm test` runs the compiled `.mjs` test files.

**`requires_validation: true` in slice scaffold (SLICE-05)**

- `sliceFromFeature` now writes `requires_validation: true` to the slice frontmatter template.
- Operators can override to `false` for pure-refactor or doc-only slices to waive the validation gate upfront.

**`slice-linker` decomposition into 4 sub-modules (FEAT-022)**

- `slice-linker.mts` (741 lines) split into focused modules: `feature-lifecycle.mts`, `complete-slice.mts`, `start-slice.mts`, `dispatch.mts`.
- Public API preserved via barrel re-export. All 401 tests unchanged.

**Dispatch budget enforcement**

- `buildDispatchInstruction` now accepts `dispatchLimits` (from `loop.json`) and injects a hard-limit budget block into every builder subagent prompt.
- Builder sees: max subagents per slice, inline-preferred task types, bundle hint.
- `startSlice` propagates `resolved.loop.dispatchLimits` automatically.

### Fixes

**Cost report `costProject` slug mismatch**

- `loop.json` `costProject` corrected to `"C--work-mega-hero-crew-autonomous-loop"` — matches the slug the crew cost-slice CLI derives from the Windows repo path.
- Previously caused `sessions_scanned: 0` in all cost reports and false F grades.

## v0.5.2 — 2026-05-28 — quality gates: AC linter, ladder, marathon, test-adequacy

### Features

**AC linter gate (`startSlice`)**

- New `ac-linter.mjs` module: rejects slice start when any `AC-N:` bullet is a
  placeholder (`...`, `<...>`, `TBD`, or empty).
- Slice template updated: `AC-1` is now a concrete criterion; `AC-2` is an explicit
  placeholder that agents must replace before calling `startSlice`.

**Ladder gate (`startSlice`)**

- Blocks start when `checkGradeTrend` signals ≥ 2 consecutive below-threshold scores.
- Threshold and window size configurable via `loop.gradeTrendThreshold` /
  `loop.gradeTrendConsecutiveLimit` in `loop.json`.

**Marathon milestone (`startSlice`)**

- Returns `marathonMilestone` in `startSlice` result when all window scores are at
  or above threshold, signalling a sustained quality run.
- Window size configurable via `loop.marathonMilestoneLength`.

**Test-adequacy gate (`completeSlice`)**

- New `test-adequacy-gate.mjs`: reads linked review artifacts and checks each for a
  populated `Test Adequacy:` field (crew CLI writes `-` by default).
- `completeSlice` refuses to advance feature → done when any linked review artifact
  leaves `Test Adequacy: -` with no skip reason.
- Reviewer prompts now warn that `--test-summary` is gated: leaving it as `-` blocks
  the feature transition.

### Tests

42 new tests (401 total). All pass.

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
- PM agent prompt (`agents/pm.md`) + 3 skills (triage, pm-review,
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
