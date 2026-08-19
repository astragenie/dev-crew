# Repo Instructions — dev-crew

@AGENTS.md

> Tool-agnostic scaffold guide above. Everything below is repo-specific.
> Clauses are short pointers by design — full detail: `docs/memory.md`,
> `docs/ci-gates.md`.

## Session protocol (mandatory, not advisory)

Before non-trivial work: **read `docs/memory.md` in full** (the ONLY
source for load-bearing contracts/path drift/merge history), **re-verify**
against live state before relying on an entry, **write back** corrections
the same session you find them.

## Mission

**dev-crew** (plugin id `devcrew`, CLI namespace `/devcrew:*`) unifies two
prior plugins: **crew**'s dispatcher-guided ceremony layer (bounded
specialists, quality gates, inspectable handoffs, GEPA optimization) +
**runner**'s autonomous layer on top (PM-triaged backlog,
Given-When-Then specs, wave dispatch, phase-gate checks, retrospectives).
The two used to couple across a fragile cross-repo seam (`execFile`
bridge, version pins, marketplace drift); merging turns that into
ordinary function calls under one release train, one agent/skill
registry, one CI gate list, one test suite. Dogfoods what it ships.
**Operator decisions, 2026-08-18 — do not relitigate:** Bun-first
everywhere, no build step; plugin+methodology are both **dev-crew**,
prior branding retired; sole operator during the merge window.

## Authority documents

Read first: `README.md` → `docs/code-conventions.md` → `docs/memory.md`.

- **`README.md`**/**`ADOPTION.md`** — what this ships, install, walkthrough.
- **`docs/memory.md`** — durable facts: contracts, path drift, merge history.
- **`docs/README.md`** — `docs/` map, incl. deferred `crew/docs/**` note.
- **`docs/code-conventions.md`**/**`docs/ci-gates.md`** — conventions, CI rationale.
- **`docs/upstream-requests/`** — open requests against parent-repo.
- **`docs/halt-badges.md`** — halt-badge registry (SPEC-003).
- **`.claude/artifacts/loop/backlog/`**/**`CHANGELOG.md`** — roadmap, releases.

## Memory binding (astramem)

<!-- clause: memory-binding -->

Project id **`dev-crew`** (astramem MCP,
`mcp__plugin_crew_astramem__*`); pass `project: "dev-crew"` top-level —
nesting under `metadata` is silently dropped. **Dual-project recall:**
most lessons still live under `dev-team`/`runner-plugin` — recall those
too before "no prior art." Follow `astramem:using-memory`; short,
one-fact memories; `scope: "team"` for cross-session.

## Engineering standards

<!-- clause: engineering-standards -->

<!-- clause: local-commands -->

Consult [`Astragenie.Standards`](https://github.com/astragenie/standards)
if installed at a sibling path. `docs/code-conventions.md` is
authoritative here; `AGENTS.md` §§ Commands/Style for the rest.
**Repo topology:** `crew` is no longer an external plugin-cache dependency
— `crew/` is a vendored rump (own `plugin.json`, `bun run test:crew`,
`crew/docs/**` not yet migrated) until one `plugin.json` lands at
cutover, FEAT-006 (P5).

## CI gates

<!-- clause: ci-gates -->

Full rationale: `docs/ci-gates.md` (source of truth for name + order —
`generate-metrics-band.mts` counts this list; keep both in sync). One
merged workflow (`.github/workflows/ci.yml`, self-hosted). 1–28 blocking
(`fast-gate`), 29–34 advisory, 35–39 tsc/biome, 40–41 the two test suites:

1. `bun install --frozen-lockfile` (root + `crew/`, two lockfiles).
2. `validate-manifests.mts` — root manifest sanity.
3. `validate-content-length.mts` — 300/200-line caps.
4. `validate-event-schemas.mts` — AJV loop-event payload check.
5. `validate-decline-citations.mts --repo .` — P4 FEATs cite a clause id.
6. `validate-agent-refs.mts` — no phantom `crew:`/`runner:`/`devcrew:` tokens.
7. `validate-dispatch-markers.mts` — `<task-scoped>` marker balance.
8. `validate-imports.mts` — slice-linker import boundary.
9. `validate-backlog-writes.mts` — BacklogStore sole-writer guard.
10. `validate-slice-touches-files.mts` — slice `touches_files` sanity.
11. `validate-slice-state-consistency.mts` — state-dir/status agreement.
12. `validate-snapshot-freshness.mts` — loop-snapshot drift gate.
13. `validate-org-refs.mts` — stale pre-transfer owner sweep (incl. `crew/`).
14. `validate-marketplace-sync.mts` — registry version drift.
15. `validate-memory-config.mts` — memory-feedback config drift.
16. `validate-learnings-schema.mts --repo .` — learnings.jsonl schema.
17. `validate-effort-points.mts` — FEAT `effort_points` Fibonacci check.
18. `validate-branding-scrub.mts` — retired-name sweep, full merged tree.
19. `generate-metrics-band.mts --check` — README metrics-band freshness.
20. `crew/scripts/validate-manifests.mts` — crew's own manifest check.
21. `crew/scripts/validate-dispatch-graph.mts` — peer-dispatch DAG check.
22. `crew/scripts/validate-workflows.mts` — workflows.yaml schema/order.
23. `crew/scripts/validate-slices.mts` — AC-placeholder/workflow linter.
24. `crew/scripts/validate-badges.mts` — BADGE_TABLE cross-check.
25. `crew/scripts/validate-loop-state.mts` — single backlog tree, unique ids.
26. `crew/scripts/validate-bundles.mts` — build-bundle schema/version.
27. `crew/scripts/validate-configs.mts` — routing-table schema + drift.
28. `crew/scripts/validate-routing-table.mts --coverage-only` — skill-id resolution.
29. `crew/scripts/validate-syntheses.mts` — placeholder-rotted synthesis flag (advisory).
30. `crew/scripts/validate-routing-table.mts` full-coverage mode (advisory).
31. `crew/scripts/validate-adr-template.mts --strict` — ADR completeness (advisory).
32. `crew/scripts/validate-backlog-drift.mts` — unmoved-`done/` flag (advisory).
33. `crew/scripts/validate-agents.mts` — agent prompt quality bar (advisory).
34. `crew/scripts/validate-skills.mts` — skill quality bar (advisory).
35. `bunx tsc --noEmit` — root, root test, and `crew/tsconfig.json` (3 projects).
36. `bunx biome lint src/` (root scope).
37. `bunx biome format src/` (root, check mode).
38. `cd crew && bunx biome lint scripts/ hooks/` (crew's own config).
39. `cd crew && bunx biome format scripts/ tests/` (crew, check mode).
40. `bun test src/tests/ --parallel` (root, minus 6 quarantined suites).
41. `cd crew && bun test tests/ --parallel` (crew).

Pre-push hook runs manifest + content-length + format-check locally.

## Repo conventions

<!-- clause: repo-conventions -->

See `AGENTS.md` § Style (ESM-only, Bun, module size, content-length caps,
lint/complexity rules, `.mjs` specifiers on `.mts` sources,
`process.exitCode` not `process.exit`, zero-warning lint).

## Marathon session checkpoint

<!-- clause: marathon-checkpoint -->

`loop.marathonCheckpointEvery` (unset — default **4**): advisory at N
closes since last retrospective, hard stop at 2N. `docs/memory.md` §
"Marathon checkpoint".

## Backlog discipline

<!-- clause: backlog-discipline -->

Active backlog: `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT declares `priority`, `status`, `autonomous_safe`. `/devcrew:intake`
is the recommended entry (PM scoring + architect classification, one
call); `--deep`/`--spec` draft ACs inline. PM P4 declines cite a clause
id (`declined_per: [<clause-id>]`). `docs/memory.md` § "Backlog discipline".

## Orchestrator mode

<!-- clause: orchestrator-mode -->

`orchestratorMode` selects `"slice-build"` (default, unset here) or
`"orchestrate-slice"` (sequential). Legacy modes removed — `docs/memory.md`
§ "Orchestrator mode".

## Reviewer ladder presets

<!-- clause: reviewer-ladder-presets -->

`reviewers.ladder` is config-driven (`["A","B"]`, `["A"]`, `["B"]`).
**This repo's setting is `["A","B"]`** — the two-reviewer default.
`docs/memory.md` § "Reviewer ladder".

## Owned agents

<!-- clause: owned-agents -->

Dispatch via `Agent(subagent_type: ...)`, one `devcrew:` namespace: former
`runner:` role agents (`pm`, `architect`, `researcher`,
`market-researcher`, `document-writer`, `swarm`) + former `crew:`
specialists (`fullstack-dev`, `backend-dev`, `frontend-dev`, `reviewer`,
`verifier`, more) — full list in `agents/`.

## Auto-dispatch primitives

<!-- clause: auto-dispatch-primitives -->

`src/scripts/lib/auto-dispatch.mts` is opt-in audit infra — subcommands
do NOT auto-dispatch agents; slash flows are the contract (DEC-011).

## Safety

<!-- clause: safety -->

Never commit secrets. Never disable hooks (`--no-verify`) without
request. Never force-push `main`.

## Decisions not to relitigate

- **`clause: ...` markers + `## CI gates` list are machine-read** — see
  `docs/memory.md` § "Load-bearing CLAUDE.md contracts" first.
  `backlog-discipline`/`repo-conventions` are live-cited by
  `declined_per` — never delete/rename without a citation sweep.
- **Never hand-edit the marker blocks below** — regenerated by
  `/crew:install` / `/devcrew:install`; edit config instead.
- **Never register a local plugin marketplace** — GitHub source only.
- Everything in `@AGENTS.md`'s Never-do applies.

<!-- crew:start -->
<!-- Crew framework memory. Run /crew:install after plugin updates that change framework memory. -->
@.claude/crew/constitution.md
<!-- crew:end -->

<!-- runner:start -->
<!-- Installed by /runner:install. Edit .claude/loop.json to change stack-specific commands; re-run /runner:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the dev-crew method autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks the entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts. Iteration cap and soft `blocked` badge are advisory in this mode — set `loop.marathonMode: false` in `.claude/loop.json` to restore the legacy five-condition gating.
- **Slice start ceremony.** Every slice MUST open via `/runner:slice start --id SLICE-NN` (rotates `currentRun` so cost auto-emit attributes the work correctly + refreshes `.claude/state/crew/slice-progress.md`).
- **Dispatch discipline.** The loop is an orchestrator, not an implementer. Hand the `slice start` return's `dispatchInstruction` to a crew builder subagent — `crew:fullstack-dev` (or the stack-specific `crew:backend-dev` / `crew:frontend-dev`), or generic `claude` (implementation only; there is no agent literally named `crew:builder`); after it returns, dispatch `crew:reviewer`, then `crew:validator` if behavior changed; pivot to `/crew:fix` on any needs_fix or fail. Inline implementation is reserved for trivial single-line fixups.
- **Slice close ceremony.** Every slice MUST close via `/runner:slice complete --id SLICE-NN` (writes handoff + final-synthesis + cost-report + cost-advise) followed by `/runner:slice grade*`. Manual file moves + a `docs(slice): mark ... complete` commit are NOT a substitute.
- **Build entry points.** `/crew:build` is the interactive single-slice path (lighter — no run-brief required). Autonomous loop is the unattended multi-slice path (full ceremony). Never run both against the same branch — they race on workflow-state.
- **Auto-continue.** After the ceremony, scan `.claude/artifacts/loop/specs/` → `.claude/artifacts/loop/backlog/pending/` → `.claude/artifacts/loop/backlog/triaged/` and promote the next item without asking.
- **Phase gate.** When the last slice in a phase completes, run `/runner:phase-gate` before starting the next phase.
- **Worktree parallelism.** Run parallel features in sibling git worktrees — each has its own `.claude/state/`. Cost attribution is auto-scoped per worktree. Use `crew fleet --repo "$PWD"` for a one-glance view. Never check out the same branch twice; never push from inside the loop.

First action when starting the runner: read `.claude/loop/rules.md` → `.claude/artifacts/loop/ai-loop/00-entry/MASTER_PROMPT.md` → `.claude/artifacts/loop/ai-loop/backlog/approved-slices.md`.

<!-- runner:end -->

## Project state (auto-generated)

@.claude/artifacts/loop/loop-snapshot.md
