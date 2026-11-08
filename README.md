# dev-crew

[![test](https://github.com/astragenie/devcrew/actions/workflows/test.yml/badge.svg)](https://github.com/astragenie/devcrew/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/tag/astragenie/devcrew?label=release&sort=semver)](https://github.com/astragenie/devcrew/releases)
[![license](https://img.shields.io/github/license/astragenie/devcrew)](LICENSE)

A unified engineering-OS Claude Code plugin (plugin id `devcrew`, CLI
namespace `/devcrew:*`): a dispatcher-guided ceremony layer (bounded
specialist subagents, quality gates, inspectable handoffs) fused with an
autonomous layer on top of it (PM-triaged backlog, slice-scoped
Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
checks, decision-grade retrospectives) — one repo, one release train, one
CLI namespace, where this used to be two separately-shipped plugins
(`crew`/`dev-team` and `loop`/`runner-plugin`) bridged by a fragile
cross-repo seam. HARD RULE blocks, slice scaffold, plugin-owned
loop-control docs, and a safe phase-gate runner all ship from this single
repo now.

Post-merge, the ceremony layer ships from inside this same repo — see
"Repo topology" in `CLAUDE.md`. `crew/` is a vendored rump of the
pre-merge `crew`/`dev-team` plugin still used for artifact writers today
(`crew write-validation-result`); the eventual single-plugin cutover is
tracked as FEAT-006 (P5, operator-authorized).

<!-- demo-recording: pending W4.1 asciinema asset -->

<!-- metrics-band:start -->
_Dogfood metrics — generated 2026-11-08. Every number below is computed from this repo's own artifacts; regenerate with `bun src/scripts/generate-metrics-band.mts --write`._

| Metric | Value |
|---|---|
| FEATs shipped (done) | 30 |
| Slices closed, last 90 days | 54 |
| Grade average, last 5 slice closes | 0.898 (n=53 total) |
| median per slice-close session scan | $4.455 (mean $6.958, +56.2% divergence) |
| Halt badges documented | 16 |
| CI gates enforced | 43 |

Sources:
- FEATs shipped / slices closed: `.claude/artifacts/loop/backlog/done/*.md` frontmatter (`completed_at`, `slices`).
- Grade average: `.claude/artifacts/loop/grades/*.md` — composite of the last 5 grade files.
- Cost scan: `.claude/artifacts/crew/cost/*-cost-report-*.md` `usd` field, last 20 reports (`loadCostReportUSDValues`).
- Halt badges: `docs/halt-badges.md` registry (every per-badge `### ` section + wave-mode badges table).
- CI gates: `CLAUDE.md` § "CI gates" numbered list.
<!-- metrics-band:end -->

## How this compares

Positioning we can back with an artifact, not a slogan — every claim below
either cites a file in this repo or a specific PR/issue. Compared against
"generic agent platforms" as a category, not any named product.

| Dimension | dev-crew (this repo) | Generic agent platforms |
| --- | --- | --- |
| Halt/stop enforcement | Documented halt badges (see metrics band above; `docs/halt-badges.md`), each with an explicit `Fires when` condition wired into either the walker's `stop-conditions.mts` snapshot or the close-time gate pre-flight, and fanned out as `halt_badge` / `halt_badge.resolved` webhook events — not just prose guidance. | Typically prose-only "best practices" or a single generic stop condition, with no cross-plugin fan-out contract to verify a badge actually fired. |
| Prompt optimization | One fully auditable live promotion: GEPA judge trial `c948e52c`, `aiplugin-dev` 1.2.3→1.2.4 (CHANGELOG-traceable). Default candidate generation is synthetic string mutation — real LLM reflection only runs behind an explicit flag, and that distinction is documented rather than blurred. | Often marketed as "self-improving" or "reflective" with no public trial artifact a reader can open and verify. |
| CI enforcement | CI gates enforced (see metrics band above; `CLAUDE.md` § "CI gates"), several traced directly to a production incident retro — e.g. phantom-agent dispatch (#371), stale pre-transfer owner refs (#474), worktree-hang quarantine (#355). | Gate counts, when published, are rarely tied to a named incident a reader can look up. |
| Cost reporting | Median per slice-close session scan reported alongside the mean with a divergence flag, so a skewed average can't hide behind a single headline number (see metrics band above). | Cost claims are usually a single average, or omitted entirely. |
| Access | `/plugin install devcrew@astra` — self-serve, no waitlist, on any tier. | Some competing "self-learning" agent platforms gate every pricing tier, including free, behind a waitlist. |

_Comparison reflects publicly documented positioning as of 2026-07-18._

## Install

Two layers: the **plugin** is installed once per machine; the **method
layer** is installed once per repo.

### Prerequisites (per machine)

| Need | Why | Check |
|---|---|---|
| Claude Code CLI ≥ 2.1.270 | Loads `hooks/hooks.json` — the discovery path verified live on 2.1.270 (FEAT-033) | `claude --version` |
| **Bun** on `PATH` | Runtime for every `/devcrew:*` command and most hooks (`dist/*.js` bundles) | `bun --version` |
| **Node** on `PATH` | A handful of hooks (version-drift warning, OpenTelemetry flush) run under `node` | `node --version` |
| POSIX `sh` | Event-log hooks are shell scripts; on Windows, Git Bash (what Claude Code already uses) is enough | `sh --version` |
| `git` | Target repos must be git repositories; install fails fast otherwise | `git --version` |
| `gh` (optional) | PR flows only: `/devcrew:ship`, `/devcrew:pr-fix`, report-to-PR | `gh auth status` |

No `bun install` and no registry auth are needed on the consumer machine:
every shipped hook and CLI entry runs from self-contained `dist/` bundles
(FEAT-026 / DEC-048).

### 1. Install the plugin (once per machine)

Paste one line at a time into the Claude Code prompt and let each finish —
pasting both as one block is a known way to get one silently swallowed:

```
/plugin marketplace add astragenie/astra-marketplace
/plugin install devcrew@astra
```

Then `/reload-plugins` (or restart Claude Code) and verify:

```
/devcrew:list-presets
```

It needs no repo config, so a preset table proves the plugin loaded and Bun
is reachable.

### 2. Install the method layer (once per repo)

From inside the target repo:

```
/devcrew:install --preset <preset>
```

`--preset` is required on a first install (there is no default stack —
pick from `/devcrew:list-presets`). Add `--light` on repos that already have
a CI test gate to seed the single-reviewer ladder. The command does both
layers in one pass:

1. **Global framework memory** — `~/.claude/crew/{constitution,workflow,metadata}.md`
   plus an import line in `~/.claude/CLAUDE.md`. Idempotent; skipped when
   already at the current plugin version.
2. **Repo method layer** — the marker-bracketed HARD RULE block in
   `CLAUDE.md`, loop-control docs under `<aiLoopRoot>/`, the backlog
   scaffold, and `.claude/loop.json` from the preset (written only if
   missing).

Afterwards edit `.claude/loop.json` (`productName`, `productDescription`,
`stack.*` test commands), re-run `/devcrew:install` with no flags to
regenerate `MASTER_PROMPT.md` from it, then commit `CLAUDE.md` and
`.claude/`. Full checklist with backup, pre-flight and rollback steps:
[ADOPTION.md](ADOPTION.md).

### 3. Update

Update the plugin through `/plugin` (marketplace refresh, then plugin
update), `/reload-plugins`, then re-run `/devcrew:install` with no flags in
each repo — it rewrites only the plugin-owned files and leaves
`.claude/loop.json` and everything outside the marker block untouched.

> **Known gap until FEAT-037 lands:** `commands/*.md` already invoke the
> `dist/` bundles (SLICE-55), but six `agents/*.md` prompts still call
> `crew/scripts/crew.mts` from source and fail in a `node_modules`-free
> install with `Cannot find module '@astragenie/plugin-std'`. SLICE-56
> repoints them; `src/tests/install/consumer-smoke.test.mts` tracks the
> exact remaining set in `EXPECTED_FAIL` and stays deliberately red until
> it is empty.

### Developing this repo on another machine

```bash
git clone https://github.com/astragenie/dev-crew
cd dev-crew
bun install --frozen-lockfile && (cd crew && bun install --frozen-lockfile)
bun run typecheck && bun run test:all
```

Bun is pinned to the version in `.bun-version`; `bun src/scripts/build-dist.mts --check`
fails on a mismatch. `bun install` needs read access to the
`@astragenie` registry — the token comes from the environment, never from
`.npmrc` (see `AGENTS.md` § Credentials).

> **Marketplace history:** pre-v0.8.7 shipped via `hero-crew`;
> v0.8.7–v0.41.x `loop` had its own marketplace; v0.41.0+ `crew@astra` and
> `loop@astra` were two installs from `astragenie/astra-marketplace`; since
> the 2026-08-18 merge the single `devcrew@astra` entry (source
> `astragenie/dev-crew`) replaces both. Current pinned version: the
> registry's `marketplace.json`, cross-checked by CI gate 15.

## What it does

- Installs three HARD RULE blocks in your repo's CLAUDE.md (Autonomous Loop,
  Cross-Slice Continuation, Phase Completion Gate) inside a marker-bracketed
  `<!-- devcrew:start -->` block. Re-installing replaces the block in
  place; user content outside it is preserved.
- Writes plugin-owned loop-control docs under `<aiLoopRoot>/01-loop-control/`:
  `DEV_CREW_METHOD.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`, plus
  `<aiLoopRoot>/00-entry/MASTER_PROMPT.md` and `SLICE_TEMPLATE.md`. Always
  overwritten on re-install — customization lives in `.claude/loop.json`, not
  in these files. `aiLoopRoot` is a config path (see Configuration below);
  the built-in presets default it to `.claude/artifacts/loop/ai-loop`, not a
  `docs/` path.
- Scaffolds the backlog at `<backlogPath>/`
  (`approved-slices.md`, `completed-slices.md`, `product-backlog.md`) — only
  written if missing.
- Ships a phase-gate runner that executes `{cmd, args, cwd}` triples via
  `execFile`. No shell interpretation. No injection surface from preset or
  config values.
- Auto-migrates existing ad-hoc HARD RULE blocks (the hand-pasted version some
  repos shipped before this plugin existed) into the marker-bracketed form,
  extracting phase-gate commands into the config along the way.

## Quickstart

In the target repo (plugin already installed per machine — see Install):

```bash
/devcrew:install --preset dotnet-python
```

Then edit `.claude/loop.json` to set `productName`,
`productDescription`, and `stack.*` commands for the repo. Re-run install to
regenerate `MASTER_PROMPT.md` from the updated config.

Once configured:

```bash
/devcrew:brief          # health check
/devcrew:start           # no args: auto-picks the highest-priority triaged FEAT
/devcrew:start FEAT-NNN  # start a specific FEAT (creates the slice file)
/devcrew:phase-gate --phase 4 --note "ingestion phase close"
/devcrew:list-presets    # see built-in presets
```

`/devcrew:start` subsumes the older `next-slice` / `derive-slice` /
`slice-from-feature` commands — those no longer exist as standalone slash
commands.

## Configuration

`.claude/loop.json` schema:

```jsonc
{
  "preset": "dotnet-python",
  "loop": {
    "aiLoopRoot": ".claude/artifacts/loop/ai-loop",
    "backlogPath": ".claude/artifacts/loop/ai-loop/backlog",
    "slicesRoot": ".claude/artifacts/loop/ai-loop/slices",
    "phaseGateArtifactDir": ".claude/artifacts/crew/validations"
  },
  "stack": {
    "build": [{ "cmd": "dotnet", "args": ["build", "src/MySolution.slnx", "-c", "Release"] }],
    "test": [
      { "cmd": "dotnet", "args": ["test", "src/MySolution.slnx", "-c", "Release"] },
      { "cmd": "pytest", "args": [], "cwd": "src/python-agent" }
    ],
    "frontendBuild": { "cmd": "npm", "args": ["run", "build"], "cwd": "frontend/dashboard" },
    "infraPlan": { "cmd": "terraform", "args": ["plan"], "cwd": "infra/envs/dev" },
    "aspireBoot": { "cmd": "dotnet", "args": ["run", "--project", "src/AppHost"] },
    "healthchecks": ["http://localhost:5200/healthz", "http://localhost:8080/healthz"]
  },
  "reviewers": { "ladder": ["A", "B"] },
  "mandatoryDocs": ["docs/architecture/platform-overview.md"],
  "productName": "My Product",
  "productDescription": "One-line product description",
  "stackDescription": "Free-form bullets about the stack (used in MASTER_PROMPT.md)"
}
```

Every stage is a `{cmd, args, cwd?}` triple — the argv array is what makes
phase-gate injection-safe. Set any stage to `null` to disable it. `aspireBoot`
is auto-skipped if `healthchecks` is empty (otherwise it would hang).

## Agent model tiers

Most owned agents run on the harness default model. A few are pinned to a
specific tier via the `model:` field in the agent's own frontmatter
(`agents/<name>.md`) — no `.claude/loop.json` plumbing involved:

| Agent | Pinned model | Why |
| --- | --- | --- |
| `devcrew:pm` | `opus` | Five-dimension scoring + inline AC/SPEC drafting benefits from the strongest tier. |
| `devcrew:researcher` / `devcrew:market-researcher` | `haiku` | Read-only lookups, cheapest tier suffices. |
| `devcrew:swarm` | `sonnet` | Dispatch orchestration, not deep reasoning. |
| `devcrew:document-writer` | `sonnet` | Markdown drafting (FEAT-270, 2026-08-02): a fleet cost audit found Opus at 87-100% of USD spend in most repos, while repos running non-Opus tiers landed noticeably cheaper per slice at comparable context size. Documentation work doesn't need Opus-tier reasoning, so `document-writer` is pinned to Sonnet. |

To use a different tier for an agent, edit that agent's `model:` frontmatter
field directly — there is no config-level override for individual roles yet
(a `preset.roles.<role>.model` knob was considered for this FEAT and
explicitly deferred; broader tier moves for other roles, like builder or
reviewer, need an eval gate before they're considered).

## Built-in presets

Presets are **install-time templates only** (FEAT-218 Phase 2 / DEC-069):
`/devcrew:install --preset <name>` inlines the chosen template's full content
into `.claude/loop.json` once, at scaffold time, and nothing at runtime reads
`scripts/presets/*.json` again. There is no default — `--preset` is required
for a first-time install.

| Preset                   | Stack                                                                            |
| ------------------------ | -------------------------------------------------------------------------------- |
| `dotnet-python`          | C# .NET + Aspire local orchestration + Python LangGraph agents + Terraform infra (split FE React + BE .NET) |
| `dotnet-only`            | C# .NET backend only — no frontend, Aspire, or Python sidecars                    |
| `dotnet-react`           | C# .NET backend + React / Vite frontend                                          |
| `typescript-plugin-dev`  | TypeScript Claude Code plugin repos — Bun test + manifest validators             |
| `typescript-service`     | TypeScript Node service / daemon — Fastify + better-sqlite3 / sqlite-vec, `tsc`, Vitest, JSON-schema contracts |

More templates ship as new repo types surface. See `scripts/presets/` to author your own.

## Plugin architecture

Runtime is Bun; source `.mts` files run directly — there is no emitted
`scripts/*.mjs` tree.

- `src/scripts/loop.mts` — CLI entry
- `src/scripts/lib/loop-installer.mts` (+ `loop-installer-scaffold.mts`,
  `loop-installer-tokens.mts`) — template render + marker-block merge +
  scaffold writer + ad-hoc HARD RULE block migration
- `src/scripts/lib/phase-gate.mts` — `execFile`-only runner + markdown report
- `src/scripts/lib/config-resolver.mts` — reads `.claude/loop.json` at runtime
  (no preset merge post-install); merges a named preset template only when
  the installer scaffolds a fresh config
- `src/scripts/lib/plugin-identity.mts` — marketplace/plugin name discovery,
  reused from the crew plugin's pattern
- `src/scripts/lib/hierarchical-dispatch.mts` — hierarchical parallel subagent
  dispatch primitive (FEAT-020 SLICE-1); barrel re-export of the
  `dispatch-*.mts` modules

## Hierarchical dispatch (`devcrew:swarm`, FEAT-020 SLICE-1)

A parent agent can spawn N parallel child subagents in isolated git worktrees,
block on `awaitAll`, then merge DONE children to the parent branch in priority
order. Children themselves can recurse (grandchildren fork off the child's
branch).

### Config (`.claude/loop.json`, namespace `dispatchLimits`)

```json
{
  "dispatchLimits": {
    "maxDepth": 3,
    "maxChildrenPerBatch": 8,
    "worktreeRoot": null,
    "pruneStaleAfterDays": 7
  }
}
```

| Key                   | Default | Meaning                                                                             |
| --------------------- | ------- | ----------------------------------------------------------------------------------- |
| `maxDepth`            | 3       | Recursion cap. `0` = top level. Child at `maxDepth` cannot spawn grandchildren.     |
| `maxChildrenPerBatch` | 8       | Per-call fanout cap. Refuse to spawn if `plans.length > cap`.                       |
| `worktreeRoot`        | `null`  | Override worktree parent dir; `null` = sibling of repo (same as `parallel-runner`). |
| `pruneStaleAfterDays` | 7       | Orphan `dispatch/<runId>/` directory warning threshold.                             |

### CLI surface

```bash
bun src/scripts/loop.mts dispatch prepare \
  --plan plan.json --parent-branch slice/SLICE-90 [--repo .] [--depth 0] [--json] [--dry-run]

bun src/scripts/loop.mts dispatch finalize \
  --run-id <id> --parent-branch slice/SLICE-90 --plan plan.json [--repo .] [--depth 0]
```

In production, the `devcrew:swarm` agent runs `prepare`, invokes
the Agent tool with the returned batch in **one message**, then runs `finalize`.

### Telemetry artifacts

- `.claude/artifacts/loop/dispatch/<runId>/worktrees.jsonl` — spawn log
- `.claude/artifacts/loop/dispatch/<runId>/trace.jsonl` — per-child result + duration + cost (per-child `costUsd` in the marker stays `null`; run-level totals are populated in `dispatch-metrics.json` by `finalize`, see FEAT-220)
- `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` — canonical child result (marker)
- `.claude/artifacts/loop/dispatch/<runId>/summary.md` — human-readable run summary

### Out of scope for SLICE-1

`devcrew:parallel-runner` refactor (SLICE-2), truly-async non-blocking parent, cancellation,
`--resume`, cost rollup, budget cap (FEAT-133), per-skill cost (FEAT-165).

## Wave mode

Opt-in marathon runner that dispatches N independent slices per "wave" into
parallel git worktrees, merges PASS branches, pivots FAIL slices into
`/devcrew:fix` next wave, and loops until standard stop-check fires.

Enable in `.claude/loop.json`:

```json
{
  "loop": {
    "marathonRunner": "wave",
    "wave": { "size": 3, "sliceCommand": "/devcrew:orchestrate-slice" }
  }
}
```

Run via `/devcrew:wave loop` (or `/devcrew:auto` once `marathonRunner: "wave"` is
set — auto routes to wave automatically).

Slice prerequisite: `touches_files` in slice frontmatter. Spec-writer
populates this automatically; CI gate
(`bun ./src/scripts/validate-slice-touches-files.mts`) warns when missing.
Slices without `touches_files` dispatch solo (wave size collapses to 1 for
that slot) rather than blocking the planner.

See `commands/wave.md` for full subcommand reference and
`docs/superpowers/specs/2026-06-14-wave-mode-loop-design.md` for design
rationale.

## Tests

```bash
bun test src/tests/ --parallel --timeout 60000
```

(also `bun run test`). ~300 test files under `src/tests/`. Tests that
require the `crew` CLI in the Claude Code plugin cache skip cleanly when
crew is not installed.

## Marketplace

Ships from the central `astragenie/astra-marketplace` registry (see
"Marketplace history" above) — that registry's `marketplace.json` is the
source of truth for the published entry, not this repo. Plugin code lives
in this repo ([`astragenie/dev-crew`](https://github.com/astragenie/dev-crew)).
`bun ./src/scripts/validate-marketplace-sync.mts` is a CI gate that fails a
push if the registry's pinned version drifts from `.claude-plugin/plugin.json`
here.

## `crew` rump dependency (merge window only)

Until the FEAT-006 cutover, the phase-gate runner still writes its
validation artifact through `crew write-validation-result`, resolved
against the vendored `crew/` rump inside this repo rather than an
external plugin-cache install. See "Repo topology" in `CLAUDE.md`. If you
point at a differently-named `crew` install during this window, set
`CREW_MARKETPLACE_NAME` in the environment before invoking loop CLI
commands.

## What it doesn't do (v1 scope)

- Slice review automation — Reviewer A / Reviewer B passes remain manual
- Phase numbering — agent assigns phase numbers when invoking `phase-gate`
- Cross-repo backlog aggregation
- Web UI / dashboard
- Auto-detect when a phase boundary is reached (agent decides based on slice
  metadata)

See `ADOPTION.md` for a step-by-step adoption checklist when bringing the
plugin into an existing repo.

## Memory integration

Runner is live-wired to the **astramem** MCP server (no longer a dormant
CLI-spawn bridge — `src/scripts/lib/memory-bridge.mts` was retired by
FEAT-235). GEPA-shaped events flow in-process through
`src/scripts/lib/memory-gepa.mts` / `memory-sink.mts` on slice start,
`devcrew:close` (grade write), and `devcrew:phase-gate` FAIL — recall on slice
start, remember on close.

Set `memory.enabled: "never"` in `.claude/loop.json` to disable both recall
and emit. See `docs/sop/memory-bridge.md` for the full wire contract.

### Per-repo project id convention

`memory.project` in `.claude/loop.json` is the astramem project namespace —
it scopes every `recall_memory`/`remember` call so one repo's slice history
never bleeds into another's. The convention: **set it to the repo's own
checkout directory name.** This repo is the worked example — its own
`.claude/loop.json` sets `memory.project: "dev-crew"`, matching the
`devcrew` directory's product name, and `CLAUDE.md`'s "Memory binding
(astramem)" section spells out why that value has to stay in sync with
whatever the loop's runtime sends (an explicit `memory.project` always
wins over the `productName` fallback `grade-writer.mts`/`memory-sink.mts`
fall back to when no override is set — see `docs/sop/memory-bridge.md`).
During the merge window, also recall against the two predecessor project
ids, `dev-team` and `runner-plugin` — most historical lessons still live
there (see `CLAUDE.md`'s "dual-project recall window" note).

Seed (or migrate) a repo onto this convention with the idempotent
`memory-setup` subcommand (`commands/memory-setup.md`, mirrors
`devcrew:cost-setup`'s pattern): it defaults `memory.project` to the repo
directory's basename whenever nothing is already set, and never touches an
existing value — including an explicit `enabled: false` opt-out.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
```

The same command also writes `memory.enabled`, `memory.profile.topLessons`,
and `memory.feedback.creditLoop.{enabled,k}` to match the shape
`validate-memory-config.mts` checks for — override any field inline with
`--features "project=my-repo,topLessons=15,creditLoopK=7"`.

### Fleet rollout (FEAT-274)

As of 2026-08-02, 13 of the 15 repos in the fleet ship with no `memory`
block in `.claude/loop.json` at all — no recall, no creditLoop, agents
re-learn everything per session. That gap is the root cause behind the
1.6% usefulness finding in runner-plugin#525 (creditLoop is proven out in
`dev-team` and in this repo already). Bringing an unseeded repo onto the
convention is one command, run from inside that repo, plus a check:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/validate-memory-config.mts"
```

The second command is this repo's own CI gate (`bun
./src/scripts/validate-memory-config.mts`, CI gate #17 — see
`docs/ci-gates.md`); invoking it via `${CLAUDE_PLUGIN_ROOT}` from another
repo validates that repo's own `.claude/loop.json` the same way.
