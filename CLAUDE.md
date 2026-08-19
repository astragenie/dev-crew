# Repo Instructions — dev-crew

## Mission

**dev-crew** (plugin id `devcrew`) is the unification of two Claude Code
plugins into a single engineering-OS plugin:

- **crew** (repo `astragenie/dev-team`) — the ceremony layer: a
  dispatcher-guided engineering workflow with bounded specialist subagents
  (builders, reviewers, verifiers, architects), quality gates, inspectable
  handoff artifacts, GEPA prompt optimization, and cost/observability
  tooling. Slash commands (`/crew:build`, `/crew:fix`, `/crew:ship`) act as
  dispatchers that fan out to 23+ first-party agents guided by 70+ tiered
  skills.
- **runner** (repo `astragenie/runner-plugin`, marketplace name `loop`) —
  the autonomous layer on top of crew: a PM-triaged backlog, slice-scoped
  Given-When-Then specs, parallel-worktree wave dispatch, phase-gate quality
  checks, marathon-mode autonomous backlog walks, and decision-grade
  retrospectives. (Formerly branded under a different working name — that
  name is retired; the unified methodology is simply called **dev-crew**.)

Today the two plugins couple across a fragile seam: runner resolves the crew
CLI from the plugin cache (`MIN_CREW_VERSION` gating), bridges to it through
a 700+ line `execFile` layer, and parses crew-authored artifacts; crew reads
`.claude/loop.json` as a shared contract and references runner ceremonies by
name. That seam has produced recurring failure classes — silent
agent-rename phantoms, version-floor bumps, marketplace version drift, and a
standing queue of cross-repo "upstream request" files.

dev-crew merges both codebases into one repo and (eventually) one plugin so
the seam becomes ordinary function calls under a single release train, a
single agent/skill registry, a single CI gate list, and a single test suite.

## Decided constraints (operator decisions, 2026-08-18 — do not relitigate without operator)

- **Runtime**: Bun-first everywhere. `.mts` sources run directly under Bun,
  no build/emit step; tests run `bun test --parallel` wherever possible.
  dev-team's Node `--experimental-strip-types` fallback (ADR-002) and its
  no-`--parallel` workaround are legacy to migrate away from — before
  dropping the workaround, verify the Bun scheduler bug ADR-002 was written
  against is fixed or not triggered by the migrated suites; quarantine (not
  serialize globally) any suite that still trips it.
- **Naming**: the methodology and plugin are both called **dev-crew**
  (plugin id `devcrew`). The prior working-name branding is retired — do not
  carry it into docs, templates, prompts, or command text; scrub it during
  content import.

## Ground rules for this repo

- **The merge itself is not yet decided in shape.** Planning artifacts live
  in `docs/planning/`. The decision brief (merge vs shared-package
  extraction vs status quo) gates any phase plan; the phase plan gates any
  code import. Do not start importing source from either parent repo
  without an approved plan.
- **Parent repos are read-only inputs.** `C:\work\mega\dev-team` and
  `C:\work\mega\runner-plugin` are the sources of truth for behavior; never
  edit them from work scoped to this repo.
- **This repo dogfoods the harness it will absorb** — crew + runner are
  installed here so the merged plugin is planned and built through its own
  backlog/slice/review ceremony.
- Sole operator, no external adopters to protect. Migration concerns are
  bounded to this machine's repos.
- Baseline commit discipline: no commits unless the operator asks.

## Authority documents

- `docs/planning/merge-plan-prompt-v1.md` — first-draft planning prompt
  (superseded by v2 once written; keep for provenance).
- Parent-repo authority docs: `dev-team/CLAUDE.md`, `dev-team/AGENTS.md`,
  `runner-plugin/CLAUDE.md`, `runner-plugin/AGENTS.md`,
  `runner-plugin/docs/memory.md` — read before relying on any claim about
  either parent's behavior.

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
