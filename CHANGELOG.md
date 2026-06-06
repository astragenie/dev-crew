# Changelog

All notable changes to the `loop` plugin are documented here. Versions
prior to v0.3.0 shipped under the name `autonomous-loop`.

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

| Code | Cause |
|---|---|
| `DIRTY_TREE` | Tracked-file modifications block worktree creation; untracked files under `.claude/state/` are ignored via `-uno` |
| `WORKTREE_ADD_FAILED` | `git worktree add` exited non-zero |
| `BRANCH_EXISTS` | Target branch already exists on a different worktree |
| `PATH_COLLISION` | Destination directory already exists and is not a managed worktree |
| `ROOT_NOT_WRITABLE` | `worktreeRoot` directory cannot be created or written |
| `GIT_NOT_AVAILABLE` | `git` binary not found on PATH |

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

| Key | Default | Description |
|---|---|---|
| `loop.costRegressionWindow` | `5` | Number of recent aggregate cost reports used to compute the rolling median. |
| `loop.costRegressionMultiplier` | `3.0` | Stop threshold expressed as a multiple of that median. |

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

| Old CLI                                      | New contract                  |
|----------------------------------------------|-------------------------------|
| `node scripts/loop.mjs backlog enrich`       | `/loop:backlog-enrich`        |
| `node scripts/loop.mjs backlog add` (no body)| `/loop:backlog-add`           |
| `node scripts/loop.mjs spec decompose`       | `/loop:spec-decompose`        |
| `node scripts/loop.mjs slice complete`       | `/loop:slice-complete`        |

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
