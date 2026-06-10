# loop

[![test](https://github.com/sergeymilashico/loop/actions/workflows/test.yml/badge.svg)](https://github.com/sergeymilashico/loop/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/tag/sergeymilashico/loop?label=release&sort=semver)](https://github.com/sergeymilashico/loop/releases)
[![license](https://img.shields.io/github/license/sergeymilashico/loop)](LICENSE)

A Claude Code plugin that ships the Wiggin Loop methodology as a reusable
layer: HARD RULE blocks, slice scaffold, plugin-owned loop-control docs, and a
safe phase-gate runner.

Depends on the [`crew`](https://github.com/sergeymilashico/hero-crew) plugin
(>= v0.3.3) for artifact writers — loop emits Crew
`validation-result` artifacts through `crew write-validation-result`.

## Install

```
/plugin marketplace add https://github.com/sergeymilashico/hero-crew
/plugin install crew@astra

/plugin marketplace add https://github.com/sergeymilashico/loop
/plugin install loop@loop
```

`crew` must be installed first. Minimum compatible release: `v0.3.3`. See
[ADOPTION.md](ADOPTION.md) for new-repo onboarding.

> **Note (v0.8.7+):** Loop now ships from its own marketplace, decoupled
> from `hero-crew`. Releases no longer require a paired hero-crew commit —
> a tag in `sergeymilashico/loop` propagates directly via `/plugin update`.
> Earlier versions installed via `loop@astra`; that path is removed.

## What it does

- Installs three HARD RULE blocks in your repo's CLAUDE.md (Autonomous Loop,
  Cross-Slice Continuation, Phase Completion Gate) inside a marker-bracketed
  `<!-- loop:start -->` block. Re-installing replaces the block in
  place; user content outside it is preserved.
- Writes plugin-owned loop-control docs under `docs/architecture/ai-loop/`:
  `WIGGIN_LOOP.md`, `EVIDENCE_RULES.md`, `STOP_CONDITIONS.md`,
  `MASTER_PROMPT.md`, `SLICE_TEMPLATE.md`. Always overwritten on re-install —
  customization lives in `.claude/loop.json`, not in these files.
- Scaffolds the backlog at `docs/architecture/ai-loop/backlog/`
  (`approved-slices.md`, `completed-slices.md`, `product-backlog.md`) — only
  written if missing.
- Ships a phase-gate runner that executes `{cmd, args, cwd}` triples via
  `execFile`. No shell interpretation. No injection surface from preset or
  config values.
- Auto-migrates existing ad-hoc HARD RULE blocks (the hand-pasted version some
  repos shipped before this plugin existed) into the marker-bracketed form,
  extracting phase-gate commands into the config along the way.

## Quickstart

In a repo with `crew` already installed:

```bash
/loop:install --preset dotnet-aspire-python
```

Then edit `.claude/loop.json` to set `productName`,
`productDescription`, and `stack.*` commands for the repo. Re-run install to
regenerate `MASTER_PROMPT.md` from the updated config.

Once configured:

```bash
/loop:status              # health check
/loop:start               # first action for a new session
/loop:next-slice          # pick highest-priority PENDING slice
/loop:derive-slice        # derive a slice from product-backlog
/loop:phase-gate --phase 4 --note "ingestion phase close"
/loop:list-presets        # see built-in presets
```

## Configuration

`.claude/loop.json` schema:

```jsonc
{
  "preset": "dotnet-aspire-python",
  "loop": {
    "aiLoopRoot": "docs/architecture/ai-loop",
    "backlogPath": "docs/architecture/ai-loop/backlog",
    "slicesRoot": "docs/architecture/ai-loop/slices",
    "phaseGateArtifactDir": ".claude/artifacts/crew/validations"
  },
  "stack": {
    "build": [
      { "cmd": "dotnet", "args": ["build", "src/MySolution.slnx", "-c", "Release"] }
    ],
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

## Built-in presets

| Preset | Stack |
|---|---|
| `dotnet-aspire-python` | C# .NET + Aspire local orchestration + Python LangGraph agents + Terraform infra |

More presets ship as new repo types surface. See `scripts/presets/` to author your own.

## Plugin architecture

- `scripts/loop.mjs` — CLI entry
- `scripts/lib/loop-installer.mjs` — template render + marker-block merge +
  scaffold writer
- `scripts/lib/phase-gate.mjs` — `execFile`-only runner + markdown report
- `scripts/lib/adhoc-migrator.mjs` — detects + migrates pre-plugin HARD RULE
  blocks
- `scripts/lib/config-resolver.mjs` — preset + per-repo config deep merge
- `scripts/lib/plugin-identity.mjs` — marketplace/plugin name discovery,
  reused from the crew plugin's pattern
- `scripts/lib/hierarchical-dispatch.mjs` — hierarchical parallel subagent
  dispatch primitive (FEAT-020 SLICE-1); barrel re-export of nine
  `dispatch-*.mjs` modules

## Hierarchical dispatch (`loop:hierarchical-dispatcher`, FEAT-020 SLICE-1)

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

| Key | Default | Meaning |
|---|---|---|
| `maxDepth` | 3 | Recursion cap. `0` = top level. Child at `maxDepth` cannot spawn grandchildren. |
| `maxChildrenPerBatch` | 8 | Per-call fanout cap. Refuse to spawn if `plans.length > cap`. |
| `worktreeRoot` | `null` | Override worktree parent dir; `null` = sibling of repo (same as `parallel-runner`). |
| `pruneStaleAfterDays` | 7 | Orphan `dispatch/<runId>/` directory warning threshold. |

### CLI surface

```bash
bun src/scripts/loop.mts dispatch prepare \
  --plan plan.json --parent-branch slice/SLICE-90 [--repo .] [--depth 0] [--json] [--dry-run]

bun src/scripts/loop.mts dispatch finalize \
  --run-id <id> --parent-branch slice/SLICE-90 --plan plan.json [--repo .] [--depth 0]
```

In production, the `loop:hierarchical-dispatcher` agent runs `prepare`, invokes
the Agent tool with the returned batch in **one message**, then runs `finalize`.

### Telemetry artifacts

- `.claude/artifacts/loop/dispatch/<runId>/worktrees.jsonl` — spawn log
- `.claude/artifacts/loop/dispatch/<runId>/trace.jsonl` — per-child result + duration + cost (`null` in SLICE-1; FEAT-165 populates)
- `.claude/artifacts/loop/dispatch/<runId>/<childId>.result.json` — canonical child result (marker)
- `.claude/artifacts/loop/dispatch/<runId>/summary.md` — human-readable run summary

### Out of scope for SLICE-1

`crew:parallel-runner` refactor (SLICE-2), truly-async non-blocking parent, cancellation,
`--resume`, cost rollup, budget cap (FEAT-133), per-skill cost (FEAT-165).

## Tests

```bash
node --test tests/*.test.mjs
```

22 tests across 4 suites. Tests that require the `crew` CLI in the Claude
Code plugin cache skip cleanly when crew is not installed.

## Marketplace

Registered as a second plugin in the `astra` marketplace
(`hero-crew/.claude-plugin/marketplace.json`). A single `astra` install
picks up both `crew` and `loop`.

For independent install, this repo also ships its own
`.claude-plugin/marketplace.json` as `astra`.

## Hard dependency on `crew`

The phase-gate runner writes its validation artifact through
`crew write-validation-result`. Install errors with a clear message if the
crew CLI is not discoverable in `~/.claude/plugins/cache/astra/crew/*/`.

If you install `crew` under a different marketplace name, set
`CREW_MARKETPLACE_NAME` in the environment before invoking
loop CLI commands.

## What it doesn't do (v1 scope)

- Slice review automation — Reviewer A / Reviewer B passes remain manual
- Phase numbering — agent assigns phase numbers when invoking `phase-gate`
- Cross-repo backlog aggregation
- Web UI / dashboard
- Auto-detect when a phase boundary is reached (agent decides based on slice
  metadata)

See `ADOPTION.md` for a step-by-step adoption checklist when bringing the
plugin into an existing repo.
