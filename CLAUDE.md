# Repo Instructions — loop

Claude Code plugin: the Wiggin-Loop methodology layer that sits on top
of the `crew` plugin. Provides HARD RULE blocks, slice scaffold,
phase-gate runner, and the autonomous-development loop primitives.

## Cortex memory binding

This repo's cortex `project_id` is **`loop`**. When calling any cortex MCP tool (`MemorySave`, `MemorySearch`, `MemoryRecent`, `DecisionRecord`, etc.), ALWAYS pass:

- `projectId` = `loop`
- `scope` = `["private", "project", "shared"]` unless explicitly different

## Read first

<!-- clause: read-first -->

1. `README.md` — what this plugin is, install instructions, pinned release.
2. `ADOPTION.md` — preconditions, backup advice, and a manual install walk-through.
3. `docs/code-conventions.md` — ESM / Node conventions for this repo.
4. `docs/sop/specialist-pause-handling.md` — SOP when builder/reviewer/validator subagents pause without writing artifact (recurring 2026-06-06 pattern).
5. `docs/upstream-requests/` — open requests against hero-crew or other upstream plugins; check status before reopening dependent FEATs.
6. `docs/halt-badges.md` — registry of every halt-badge field loop emits in `snapshot.*` (cross-plugin contract per SPEC-003). MUST update when adding a new halt-badge in a future FEAT.
7. `.claude/artifacts/loop/backlog/product-backlog.md` — current roadmap (Phase 3 loop safety + telemetry).
8. `CHANGELOG.md` — recent releases.

## Engineering standards

<!-- clause: engineering-standards -->

For language-agnostic patterns and design guidance, consult
[`Astragenie.Standards`](https://github.com/astragenie/standards)
if it is installed at a sibling path. The ESM conventions are mirrored
at `Astragenie.Standards/docs/javascript/coding-conventions.md`. The
local `docs/code-conventions.md` is self-contained and authoritative
for this repo.

## Hard dependency

<!-- clause: hard-dependency -->

This plugin requires the [`crew`](https://github.com/astragenie/dev-team)
plugin at the version pinned in `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`.
`/runner:install` refuses to run against an older crew.

## Local commands

<!-- clause: local-commands -->

Runtime is **Bun** — source `.mts` files run directly, no build/emit step.

- `bun test src/tests/ --parallel --timeout 60000` — full test suite
  (also `bun run test`).
- `bun run lint` — ESLint flat config.
- `bun run format` / `bun run format:check` — Prettier.
- `bun ./src/scripts/validate-manifests.mts` — manifest sanity check.
- `bun ./src/scripts/validate-content-length.mts` — owned-agent line cap
  (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.

## CI gates

<!-- clause: ci-gates -->

GitHub Actions runs on every push and PR (all under Bun, no `npm ci`/build):

1. `bun install --frozen-lockfile`
2. `bun ./src/scripts/validate-manifests.mts`
3. `bun ./src/scripts/validate-content-length.mts`
4. `bun ./src/scripts/validate-decline-citations.mts --repo .`
5. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
6. `bunx eslint src eslint.config.mjs`
7. `bunx prettier --check "src/**/*.mts"`
8. `bun test src/tests/ --parallel --timeout 60000`
9. `bun ./src/scripts/validate-snapshot-freshness.mts` — blocks a stale
   `.claude/artifacts/loop/loop-snapshot.md` from merging (FEAT-208).
   Regenerates the snapshot content in-memory and diffs it against the
   on-disk file; any drift (backlog/grade counts, "next to slice" list,
   decisions, telemetry) fails CI. The pre-push hook still runs this
   check in warn-only mode (`--check-generated`) — CI is the hard gate.

Pre-push hook (`src/scripts/pre-push-validate.mts`, run via Bun) runs
manifest + content-length + format-check locally before any `git push`.

## Repo conventions

<!-- clause: repo-conventions -->

- ESM only. No CommonJS. Source is `src/scripts/*.mts`, run directly
  under Bun — there is **no emitted `scripts/*.mjs` tree** (the Bun
  migration dropped it). Relative imports keep the `.mjs` specifier
  extension (e.g. `./lib/foo.mjs`); Bun/tsc resolve it to the `.mts`
  source. `tsc --noEmit` is typecheck-only.
- One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines; `skills/**/SKILL.md` capped
  at 200 (enforced by `validate-content-length`). `agents/3rdparty/`
  exempt — vendored, kept as-is to avoid fork-and-trim chores.
- Tests colocated in `src/tests/*.mts`, run directly under Bun.
  Behavior-descriptive file names (no release-version prefixes).
- Lint output must be clean. Zero warnings. ESLint cyclomatic
  complexity capped at 15 — reduce by extracting helpers, not by
  suppressing the rule.
- No `process.exit(N)` from library functions — set
  `process.exitCode` from entry points only.
- Runtime-only modules without `.mts` source (e.g. `github-sync/`)
  need ambient `.d.mts` shims under `src/scripts/lib/` so callers
  can drop `@ts-ignore`. Tests for these modules SHOULD still live
  under `src/tests/*.mts` (with `// @ts-nocheck` if they need to
  import the runtime `.mjs` directly) — the `ban-ts-comment` rule is
  disabled for `src/tests/**`.
- Entry-point scripts that ship as hand-authored `.mjs` (no `.mts`
  source) — currently `scripts/setup-github-sync.mjs`,
  `scripts/setup-task-store.mjs`,
  `scripts/competitor-audit/aggregate.mjs`, `eslint.config.mjs`, and
  the two `hooks/*.mjs` files. These are intentional exceptions, not
  drift. Anything else under `scripts/` without an `src/scripts/...mts`
  counterpart is drift and should be ported.

## Marathon session checkpoint

<!-- clause: marathon-checkpoint -->

Long autonomous backlog walks accumulate drift if the loop never pauses
to reflect. `checkMarathonCheckpoint` counts grade files written after
the newest retrospective. Configured via `loop.marathonCheckpointEvery`
in `.claude/loop.json` (default **4** per the AgentOps coherent-arc rule):

- At `>= every` closes → **advisory** suggestion `marathon_checkpoint_due`.
  Loop continues; operator should run `/runner:retrospective` soon.
- At `>= 2 * every` closes → **hard** stop with reason
  `marathon_checkpoint_required` + `marathon-checkpoint` blocker. Loop
  refuses the next slice until a retrospective lands under
  `.claude/artifacts/loop/retrospectives/`.

Snapshot exposes `marathonCheckpoint: { level, closesSinceCheckpoint,
every, hardThreshold, lastRetroPath }` so dashboards can surface
checkpoint pressure before it becomes a hard stop. Set
`marathonCheckpointEvery: 0` or a negative value to opt out — the
parser falls back to the default rather than disabling, so a true
opt-out requires removing the snapshot consumer or running
`/runner:retrospective` continuously.

## Backlog discipline

<!-- clause: backlog-discipline -->

Active backlog under `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT has frontmatter declaring priority, status, and an
`autonomous_safe` flag. The loop only picks
`autonomous_safe: true` items without per-slice human review; creative
items still require a human in the loop on review.

**Recommended default for fresh intake**: `/runner:intake` runs both
phases in one invocation — PM scoring (Phase 1) then architect
classification (Phase 2), with a halt-on-PM-error gate and a P4-decline
filter on Phase 2. Replaces the two-step `/runner:triage` + `/runner:backlog-enrich`
sequence. Both legacy commands still work for partial-intake scenarios
(score-only or classify-only).

**Higher-quality opt-in for vague-AC batches**: `/runner:retriage` runs
the same PM scoring contract as `/runner:triage` but PREPENDS an
AC-clarity-gate pre-flight to the PM dispatch. When PM finds vague AC
on a FEAT, it dispatches `runner:spec-writer` to rewrite the AC in
Given-When-Then form, waits, re-reads, and scores against the cleaned
AC. Cost up to 2× per FEAT vs. `/runner:triage`; scoring accuracy
(especially `effort_estimate` + `technical_risk`) up. Spec-writer
dispatch failure forces `composite_priority: "needs-review"` so the
walker won't auto-promote a half-scored FEAT.

`/runner:backlog-enrich` writes three routing fields into FEAT
frontmatter: `tags`, `needs_contract`, `needs_ux`. Project-level
stack identity (language, framework, contract type, deployment) lives
in `scripts/presets/*.json` and is read at builder-dispatch time via
`bun src/scripts/loop.mts resolve-skills --variant <fe|be|single>`. See
`docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md`
for the design.

Prior `surface` / `stack` per-FEAT classification was dropped on
feat/preset-skill-activation — preset is sole source. The earlier
upstream-request `docs/upstream-requests/archive/2026-06-07-hero-crew-orchestrate-slice-surface-stack-routing.md`
is superseded by the resolver CLI (no FEAT-level reader required).

PM declines that set `composite_priority: P4` MUST cite a clause id
from this file in `declined_per: [<clause-id>]` frontmatter — the
clause-id annotations (`<!-- clause: <id> -->`) on every H2 above are
the citation surface. See `agents/pm.md` § "Decline contract" for the
full contract, and `scripts/validate-decline-citations.mjs` for the CI
gate that enforces it.

## Orchestrator mode

<!-- clause: orchestrator-mode -->

`/runner:slice start` emits a slice-build tag-routed dispatch by default.
Controlled by `config.loop.orchestratorMode` in `.claude/loop.json`:

- `"slice-build"` (default) — emit `Dispatch crew:<variant>-dev subagent...`
  where `<variant>` is `frontend` / `backend` / `fullstack` based on the
  slice's `tags`. `fe` AND `be` produces a `PARALLEL DISPATCH` block
  with both subagents in one Agent message. When the slice declares
  `needs_contract: true` AND no contract artifact exists yet, prepends
  an `ARCHITECT PRE-FLIGHT` step.
- `"orchestrate-slice"` — emit `/crew:orchestrate-slice --id ...`
  (specialists run sequentially from main thread; no subagent dispatch).

Legacy modes `"lead"` and `"direct-builder"` were removed in v0.43 /
FEAT-191. Operators with stale config silently fall back to `slice-build`.

Reasons for the removal:

- `lead` mode suffered persistent specialist-pause across SLICE-97/98/99/101/102/103/104.
- `direct-builder` was a strict subset of `slice-build` with `tags: []`.

If the upstream lead-pause issue gets fixed in hero-crew, `lead` can be
revived as a separate FEAT.

### Wave mode (opt-in)

Set `loop.marathonRunner: "wave"` in `.claude/loop.json` to flip `/runner:auto`
and `/runner:start` into wave mode: per-wave parallel worktree dispatch
instead of single-slice sequential. See `commands/wave.md` and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md`.

Wave mode counts each wave as one `loop.maxIterations` increment (a
wave-size-3 config with `maxIterations: 25` allows up to 75 slice closes
per run). Tighten `maxIterations` or pass `--max-waves` to cap cost
proportionally.

Slices must declare `touches_files` in frontmatter; spec-writer populates
this automatically and `bun ./src/scripts/validate-slice-touches-files.mts`
gates CI.

## Reviewer ladder presets

<!-- clause: reviewer-ladder-presets -->

Configurable in `.claude/loop.json` under `reviewers.ladder`. Default is
`["A", "B"]` — two `crew:reviewer` dispatches with the existing
Correctness / Production-readiness focus split. The slash flow that
materializes the ladder lives in `commands/slice-review-ladder.md`.

- **Default (`["A", "B"]`)** — unchanged. Reviewer A covers
  correctness + AC coverage; Reviewer B covers production-readiness,
  observability, security.
- **`multidim` preset (FEAT-079 / SLICE-82)** — opt-in. Set
  `reviewers.ladder: { "preset": "multidim" }` to expand to three
  parallel narrow-dimension dispatches:
  - **correctness** — logic, edge cases, regressions, AC coverage.
  - **test-coverage** — test adequacy, gaps, mutation surface.
  - **conventions** — repo conventions, lint posture, doc impact.
    Each prompt declares one dimension only, carries an explicit
    scope-fence ("NOT in scope" wording) so reviewers don't bleed into
    adjacent concerns, and ships a hard tool budget (≤15 tool calls,
    ≤8 min) plus an inline-output fallback per
    `docs/sop/specialist-pause-handling.md`.

**When to pick `multidim`.** Large or risky diffs spanning ≥5 files,
or any slice touching public schemas / cross-module contracts.
Wall-clock is ~2× faster than running a sequential three-pass review;
token cost is ~3× a default two-reviewer ladder, so skip it for
trivial fixups, single-line patches, doc-only slices, and refactors
with `requires_validation: false`.

Full preset documentation (focus copy, budget instruction, override
recipes) lives in `commands/slice-review-ladder.md`.

## Owned agents

<!-- clause: owned-agents -->

Dispatch via `Agent(subagent_type: ...)`. The plugin runtime namespaces
owned agents with the `runner:` prefix — use the namespaced ID, not the
bare frontmatter `name:` field:

- `runner:pm` — backlog scoring across 5 dimensions; `compositePriority:
"needs-review"` escape valve when scope exceeds PM ability.
- `runner:architect` — read-only Node ESM design + ADR drafter for
  structural change. Use before SLICE-A of any new contract / provider
  / cross-module refactor.
- `runner:researcher` — read-only citation-backed code archaeology + fact
  gathering. Use when a question needs evidence from the repo before a
  change is proposed.
- `runner:market-researcher` — outward-facing market investigator:
  competitor analysis (conforms to the `scripts/competitor-audit/`
  brief schema), verified multi-source web research (credibility tiers
  T1–T4, consensus levels), feature-gap evidence, trend detection.
  Writes only under `docs/research/**`. Sibling of `runner:researcher`;
  repo questions go there, market questions come here.
- `runner:document-writer` — Markdown-only docs (README, CHANGELOG, ADR,
  retros, release notes, agent / skill prompts). Will NOT edit source.
- `runner:spec-writer` — AI-ready specs at two levels: formal SPEC documents
  (10-section, REQ/SEC/CON ids, Given-When-Then AC) and executable
  slice-level SDD specs (exact contracts, ≥3 test cases, verify commands).
  Dispatched by `runner:pm` when AC clarity fails or `autonomous_safe` is
  uncertain. Supersedes the vendored `3rdparty/sdd-spec-writer` and
  `3rdparty/specification` agents (merged + removed 2026-06-10).

## Auto-dispatch primitives

<!-- clause: auto-dispatch-primitives -->

`src/scripts/lib/auto-dispatch.mts` exposes `dispatchAgent`,
`parseSkipFlag`, `appendAuditLog` as opt-in audit infrastructure.
CLI subcommands do NOT auto-dispatch role agents — slash flows are
the contract. See DEC-011 (supersedes DEC-004).

Slash flows that orchestrate role agents:

- `/runner:backlog-enrich` — architect classifies triaged FEATs (tags,
  needs_contract, needs_ux). **Wired to resolver since v0.28.0**: skill
  block from `preset.roles.architect` is prepended to the dispatch prompt.
- `/runner:triage` (via `skills/triage/SKILL.md`) — PM scores pending FEATs.
  **Wired to resolver since v0.28.1**: skill block from `preset.roles.pm`
  is prepended to the dispatch prompt.
- `/runner:backlog-add` — researcher enriches new FEAT body. Auto-dispatch
  was removed in DEC-011; researcher work happens via separate user
  invocation, not inline.
- `/runner:spec-decompose` — agent reads SPEC and identifies features. No
  inline role-agent dispatch from the slash flow itself.
- `/runner:slice-complete` — document-writer drafts CHANGELOG / ADR /
  release notes after slice close. Currently invoked by the orchestrating
  agent, not by the CLI subcommand. Will wire to the resolver when a
  CLI-driven dispatch is added.
- `/runner:slice-from-feature` — dispatches `crew:architect` (not
  `runner:architect`) for contracts. Cross-plugin; wire on hero-crew side.

`dispatchAgent` remains exported for callers that want marker-write
semantics. The marker queue at
`.claude/artifacts/loop/pending-dispatch/` is deprecated for
production use — no consumer is planned (see DEC-011).

Every dispatch (via the function, when used) still appends one JSON
line to `.claude/artifacts/loop/auto-dispatch.jsonl` — audit trail
for cost attribution.

## Safety

<!-- clause: safety -->

Never commit secrets. Never disable hooks (`--no-verify`) without
explicit user request. Never force-push to `main`.

<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

<!-- clause: autonomous-loop-hard-rules -->

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts.
- **Slice start/close ceremony.** Every slice MUST use `/runner:slice start` and `/runner:slice complete`.
- **Dispatch discipline.** Hand `dispatchInstruction` to `crew:builder` subagent (implementation only); parent loop dispatches `crew:reviewer` then `crew:validator` after; never implement inline except trivial single-line fixups.
- **Auto-continue.** After ceremony, promote next item without asking.

First action when starting the runner: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.

<!-- runner:end -->

## Project state (auto-generated)

@.claude/artifacts/loop/loop-snapshot.md
