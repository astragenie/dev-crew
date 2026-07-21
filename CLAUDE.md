# Repo Instructions — runner-plugin

@AGENTS.md

> The include above is the tool-agnostic scaffold guide (commands, structure,
> style, never-do — also read by non-Claude agents). Everything below is
> specific to this repo: what it is, decisions not to relitigate, and where
> volatile state lives. This file is meant to change rarely — the clause
> sections below are trimmed to short pointers by design; the full detail
> lives in `docs/memory.md` and `docs/ci-gates.md` so this file doesn't
> re-bloat every time an implementation detail shifts.

## Session protocol (mandatory, not advisory)

Before any non-trivial work (feature, fix, review, plan):

1. **Read `docs/memory.md` in full** (~150 lines, cheap) — it is the ONLY
   source for load-bearing CLAUDE.md machine contracts, known path drift,
   command-history detail, and open upstream-request state. Skipping it
   means working on stale or structurally-wrong assumptions about this repo.
2. **Re-verify before relying.** `docs/memory.md`'s "Open upstream requests"
   and dogfood-metrics entries are a cache, not the truth — check the live
   state (`gh issue view`, the target repo) before depending on one.
3. **Write-back is part of the task.** Any fact you verify or change: update
   `docs/memory.md` in the same session — supersede the entry in place.

## Mission

**runner-plugin** (marketplace slug `loop`, plugin id `runner`, CLI namespace
`/runner:*`) ships the Wiggin Loop methodology as a reusable Claude Code
plugin layer on top of the `crew` (`dev-team`) plugin: PM-triaged backlog,
slice-scoped Given-When-Then specs, parallel-worktree wave dispatch,
phase-gate quality checks, and decision-grade retrospectives. This repo
dogfoods itself — its own `.claude/` runs the same loop it ships to adopters.

## Authority documents

- **`README.md`** — what this plugin is, install instructions, positioning.
- **`ADOPTION.md`** — preconditions, backup advice, manual install walkthrough.
- **`docs/memory.md`** — durable facts: machine contracts, path drift, command
  history, dogfood metrics.
- **`docs/README.md`** — map of the whole `docs/` tree.
- **`docs/code-conventions.md`** — ESM/Node conventions (authoritative).
- **`docs/sop/specialist-pause-handling.md`** — SOP when a builder/reviewer/
  validator subagent pauses without writing an artifact (recurring pattern).
- **`docs/upstream-requests/`** — open requests against `dev-team`/`crew` or
  `astramem-plugin`; check status before reopening a dependent FEAT.
- **`docs/halt-badges.md`** — registry of every halt-badge field the loop
  emits in `snapshot.*` (cross-plugin contract, SPEC-003) — update when
  adding a new halt-badge.
- **`.claude/artifacts/loop/backlog/product-backlog.md`** — current roadmap.
- **`CHANGELOG.md`** — recent releases.

## Memory binding (astramem)

This repo's memory project id is **`runner-plugin`**, served by the
**astramem** MCP server (`mcp__plugin_crew_astramem__*`). Pass `project:
"runner-plugin"` as a top-level field to `recall_memory`/`search_memory`/
`remember` — nesting it under `metadata` is silently dropped. `.claude/loop.json`'s
runtime `productName` must stay equal to `runner-plugin` so slice-start
recall and slice-close capture share one namespace. Follow the
`astramem:using-memory` skill loop (recall → work → `submit_feedback`/
`mark_memory_used` → optional `remember`); write short, one-fact memories;
use `scope: "team"` for anything meant to help other sessions.

## Read first

<!-- clause: read-first -->

See "Authority documents" above for the read-first list — kept there so it
isn't duplicated. Start with `README.md` → `ADOPTION.md` →
`docs/code-conventions.md` → `docs/memory.md`.

## Engineering standards

<!-- clause: engineering-standards -->

For language-agnostic patterns, consult
[`Astragenie.Standards`](https://github.com/astragenie/standards) if
installed at a sibling path (ESM conventions mirrored at
`docs/javascript/coding-conventions.md` there). `docs/code-conventions.md`
here is self-contained and authoritative for this repo. Ecosystem canon
links below.

## Hard dependency

<!-- clause: hard-dependency -->

Requires the [`crew`](https://github.com/astragenie/dev-team) plugin at the
version pinned in `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`.
`/runner:install` refuses to run against an older crew.

## Local commands

<!-- clause: local-commands -->

See `AGENTS.md` § Commands for the full list (test, typecheck, lint, format,
validators). Runtime is Bun; source `.mts` files run directly, no build step.

## CI gates

<!-- clause: ci-gates -->

Full per-gate rationale: `docs/ci-gates.md` (numbering must stay in sync —
`generate-metrics-band.mts` counts this list programmatically for the
README metrics band). GitHub Actions, all under Bun, no `npm ci`/build:

1. `bun install --frozen-lockfile`
2. `bun ./src/scripts/validate-manifests.mts` — manifest sanity.
3. `bun ./src/scripts/validate-content-length.mts` — 300/200-line caps.
4. `bun ./src/scripts/validate-decline-citations.mts --repo .` — P4 FEATs cite a real clause id.
5. `bun ./src/scripts/validate-agent-refs.mts` — no phantom `crew:`/`runner:` dispatch tokens in CLAUDE.md.
6. `bunx tsc --project tsconfig.json --noEmit` + `--project tsconfig.test.json`
7. `bunx biome lint src/`
8. `bunx biome format src/` (check mode)
9. `bun ./src/scripts/validate-imports.mts` — slice-linker import boundary.
10. `bun ./src/scripts/validate-backlog-writes.mts` — BacklogStore sole-writer guard.
11. `bun ./src/scripts/validate-slice-touches-files.mts` — slice `touches_files` sanity.
12. `bun test src/tests/ --parallel --timeout 60000`
13. `bun ./src/scripts/validate-snapshot-freshness.mts` — loop-snapshot drift gate.
14. `bun ./src/scripts/validate-org-refs.mts` — stale pre-transfer owner sweep.
15. `bun ./src/scripts/validate-marketplace-sync.mts` — registry version drift.
16. `bun ./src/scripts/validate-dispatch-markers.mts` — `<task-scoped>` marker balance.
17. `bun ./src/scripts/validate-memory-config.mts` — memory-feedback config drift.
18. `bun ./src/scripts/generate-metrics-band.mts --check` — README metrics-band freshness.

Pre-push hook runs manifest + content-length + format-check locally.

## Repo conventions

<!-- clause: repo-conventions -->

See `AGENTS.md` § Style for the full list (ESM-only, Bun, module size,
content-length caps, lint/complexity rules, `.mjs` import specifiers on
`.mts` sources, `process.exitCode` not `process.exit`).

## Marathon session checkpoint

<!-- clause: marathon-checkpoint -->

Long autonomous backlog walks accumulate drift without periodic reflection.
`loop.marathonCheckpointEvery` in `.claude/loop.json` (default 4) triggers an
advisory suggestion at N closes since the last retrospective, and a hard
stop at 2N. Full parameters + snapshot shape: `docs/memory.md` § "Marathon
checkpoint".

## Backlog discipline

<!-- clause: backlog-discipline -->

Active backlog: `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT declares `priority`, `status`, `autonomous_safe`. `/runner:intake`
is the recommended entry point (PM scoring + architect classification in one
call); `--deep`/`--spec` draft Given-When-Then ACs inline. PM P4 declines
must cite a clause id (`declined_per: [<clause-id>]`) from this file. Full
command history, the ARCHITECT GATE `arch_*` frontmatter contract, and the
preset-template change (DEC-069): `docs/memory.md` § "Backlog discipline".

## Orchestrator mode

<!-- clause: orchestrator-mode -->

`config.loop.orchestratorMode` in `.claude/loop.json` selects `"slice-build"`
(default — per-tag `crew:<variant>-dev` subagent dispatch) or
`"orchestrate-slice"` (`/crew:orchestrate-slice`, sequential). Legacy modes
`"lead"`/`"direct-builder"` were removed in v0.43/FEAT-191 — history and
removal rationale: `docs/memory.md` § "Orchestrator mode". Wave mode
(`loop.marathonRunner: "wave"`) is opt-in per-wave parallel dispatch — see
`commands/wave.md`.

## Reviewer ladder presets

<!-- clause: reviewer-ladder-presets -->

`.claude/loop.json`'s `reviewers.ladder` is config-driven (`["A","B"]`,
`["A"]`, or `["B"]`; empty/invalid falls back to two-reviewer default).
**This repo's current setting is `["A"]`** with no post-builder validator —
the close-time validation gate is satisfied by the reviewer's approval badge
(`loop.validation.satisfiedByReview: true`). Detail: `docs/memory.md` §
"Reviewer ladder".

## Owned agents

<!-- clause: owned-agents -->

Dispatch via `Agent(subagent_type: ...)`, namespaced `runner:`:

- `runner:pm` — backlog scoring (5 dimensions); `needs-review` escape valve.
- `runner:architect` — read-only Node ESM design + ADR drafting.
- `runner:researcher` — read-only citation-backed code archaeology.
- `runner:market-researcher` — outward-facing competitor/market research; writes only under `docs/research/**`.
- `runner:document-writer` — Markdown-only docs; will not edit source.
- `runner:swarm` (formerly `runner:hierarchical-dispatcher`) — N parallel child subagents in isolated worktrees, depth-capped via `dispatchLimits.maxDepth`.

Retirement history (`runner:spec-writer`, the hierarchical-dispatcher
rename): `docs/memory.md` § "Owned agents".

## Auto-dispatch primitives

<!-- clause: auto-dispatch-primitives -->

`src/scripts/lib/auto-dispatch.mts` is opt-in audit infrastructure — CLI
subcommands do NOT auto-dispatch role agents; slash flows are the contract
(DEC-011). Detail + which slash flows dispatch which agent:
`docs/memory.md` § "Auto-dispatch primitives".

## Safety

<!-- clause: safety -->

Never commit secrets. Never disable hooks (`--no-verify`) without explicit
user request. Never force-push to `main`.

## Decisions not to relitigate

- **CLAUDE.md's clause-id HTML comments (`clause: ...` markers) and the
  `## CI gates` numbered list are machine-read** (`clause-registry.mts`,
  `generate-metrics-band.mts`, `validate-agent-refs.mts` all parse this file
  specifically) — see `docs/memory.md` § "Load-bearing CLAUDE.md contracts"
  before restructuring headings, renaming a clause, or changing the
  CI-gate list's count/order.
- **Never hand-edit the `<!-- runner:start -->`/`<!-- runner:end -->` block
  below** — it's regenerated by `/runner:install` from
  `templates/claude-md-hard-rules.md`; edit `.claude/loop.json` instead.
- **Never register a local plugin marketplace** — GitHub source only
  (`.claude/crew/plugin-marketplace.md`).
- Everything in `@AGENTS.md`'s Never-do still applies.

## Ecosystem canon (kb)

`../kb/...` links are filesystem-relative — machine-local, work only on this
box. Prefer stable GitHub URLs for anything an agent must fetch in CI/cloud.

- This repo IS the reference implementation of two kb patterns:
  [wiggin-loop](../kb/05-patterns/wiggin-loop.md),
  [crew-harness](../kb/05-patterns/crew-harness.md) (crew-harness's "loop"
  role dependency). kb's `02-systems/loop.md` page is stale as of this audit
  (cites v0.1.11 / `/autonomous-loop:*` commands / "CLAUDE.md absent" —
  all superseded) — don't trust it without a refresh; flagged back to the
  vault owner rather than linked here as authoritative.
- Org/rename history: [ADR-013, GitHub org consolidation](../kb/04-decisions/cross-cutting.md#github-org-consolidation)
  — directly documents this repo's own `loop`→`runner-plugin` /
  `sergeymilashico`→`astragenie` transition.
- Agent workflow standards: [10-ai-rules/20-agent-workflow-standards.md](../kb/10-ai-rules/20-agent-workflow-standards.md)
  — directly relevant, this repo builds agent-workflow tooling.
- General engineering standards: [08-engineering/](../kb/08-engineering/)
  (definition-of-done, code quality, minimal-change, testing).
- Security: [security/12-security-standards.md](../kb/security/12-security-standards.md)
  — relevant to ingest-token / marketplace-auth handling.

<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

<!-- clause: autonomous-loop-hard-rules -->

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts.
- **Slice start/close ceremony.** Every slice MUST use `/runner:start` and `/runner:close`.
- **Dispatch discipline.** Hand `dispatchInstruction` to a crew builder subagent — `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (implementation only; there is no agent literally named `crew:builder`); parent loop dispatches `crew:reviewer` then `crew:validator` after; never implement inline except trivial single-line fixups.
- **Auto-continue.** After ceremony, promote next item without asking.
- **Ad-hoc dispatch marker (FEAT-263 T6).** When composing an ad-hoc `Agent()`
  dispatch prompt (outside the templated ceremony), wrap task-scoped orders
  (forbidden items, gates, return format) in a `<task-scoped>`…`</task-scoped>`
  block and never quote that block's content back in reports — measured
  evidence shows ad-hoc prompts, not templates, produce ~all instruction-echo
  memory chaff (see astramem-local#374 E3).

First action when starting the runner: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.

<!-- runner:end -->

## Project state (auto-generated)

@.claude/artifacts/loop/loop-snapshot.md
