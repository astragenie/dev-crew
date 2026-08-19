# dev-crew — Agent Instructions

Claude Code plugin (plugin id `devcrew`, CLI namespace `/devcrew:*`) that
unifies two prior plugins into one engineering-OS: a dispatcher-guided
ceremony layer (bounded specialist subagents, quality gates, inspectable
handoffs, GEPA prompt optimization) plus an autonomous layer on top of it
(PM-triaged backlog, slice-scoped Given-When-Then specs, parallel-worktree
wave dispatch, phase-gate quality checks, decision-grade retrospectives).
Formerly two separate repos/plugins (`crew`/`dev-team` and
`runner-plugin`/`loop`) — merge in progress, tracked as FEAT-002 through
FEAT-006 in this repo's own backlog. Full mission, merge decisions, and
volatile state: `CLAUDE.md` + `docs/memory.md`.

## Commands

Runtime is **Bun** — source `.mts` files run directly, no build/emit step.

```bash
bun install --frozen-lockfile
bun run test                                      # this repo's own suite: src/tests/, ~parallel
bun run test:crew                                  # crew/ rump's legacy suite (cd crew && bun test tests/)
bun run test:all                                    # both suites
bun run typecheck                                   # tsc --noEmit, tsconfig.json + tsconfig.test.json
bun run lint                                         # biome lint src/
bun run format / bun run format:check                # biome formatter
bun run validate:manifests                           # plugin manifest sanity
bun run validate:lengths                             # agent/skill content-length caps
bun run validate:imports                             # slice-linker sub-module boundary
bun run validate:event-schemas                       # loop-events JSON-schema conformance
```

Full CI gate list (19 gates, all Bun-only, no `npm ci`/build step for this
repo's own tree): `docs/ci-gates.md`. Pre-push hook
(`src/scripts/pre-push-validate.mts` via `hooks/pre-push-gate.mts`) runs
manifest + content-length + format-check locally before `git push`.

## Structure

```
src/scripts/            CLI entry (loop.mts) + lib/ (installer, phase-gate,
                         config-resolver, clause-registry, slice-linker,
                         gepa/, dispatch-*.mts, ...)
src/tests/               Bun test files for this repo's own tree, colocated
                         by behavior
agents/                  Owned agent prompts, single roster covering both
                         the former runner: role agents (pm, architect,
                         researcher, market-researcher, document-writer,
                         swarm) and the former crew: specialist roster
                         (fullstack-dev, backend-dev, frontend-dev,
                         reviewer, verifier, architect-reviewer,
                         qa-expert, ...) — 300-line cap; agents/3rdparty/
                         exempt (vendored)
commands/                Slash command definitions (/devcrew:*) — merged
                         command surface, one namespace
skills/                  Skill definitions (200-line SKILL.md cap):
                         universal/, workflow/, domain/, meta/, plus
                         loop-discipline/, triage/, pm-*/
templates/               Install-time templates rendered into ADOPTER
                         repos — PRODUCT surface, not this repo's own
                         instructions
schemas/, hooks/, tools/ JSON schemas (schemas/loop-events/), Claude Code
                         hooks, demo-seed tooling
evals/, gepa.config.json GEPA prompt-optimization harness + trial config
langfuse/, models.yaml    Observability wiring + model-router config
docs/                    See docs/README.md for the full map
crew/                    Vendored rump of the pre-merge `crew`/`dev-team`
                         plugin — still carries its own
                         `.claude-plugin/plugin.json`, package.json, test
                         suite (`test:crew`), and docs tree
                         (`crew/docs/**`, 123 files, not yet migrated).
                         Treat as an internal library / historical
                         reference during the merge window, not a
                         separately-shipped plugin — do not add new
                         product surface here; new work lands in the
                         merged root agents/commands/skills/src/ tree.
                         Full disposition tracking: FEAT-005 (this merge
                         phase) and docs/README.md's map entry for
                         `crew/`.
.claude/                 This repo dogfoods its own plugin (loop.json,
                         crew.json, backlog, slices, grades) — see
                         docs/memory.md for current state
```

## Style

- ESM only, no CommonJS. One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines, `skills/**/SKILL.md` at 200
  (enforced by `validate-content-length`; `agents/3rdparty/` exempt —
  vendored). `crew/` rump content is not subject to this repo's own
  content-length gate until it's migrated into the merged tree.
- Relative imports keep the `.mjs` specifier extension even though the
  source is `.mts` (Bun/tsc resolve it) — there is no emitted
  `scripts/*.mjs` tree.
- Biome cognitive complexity capped at 15 — reduce via extracted helpers,
  not rule suppression.
- No `process.exit(N)` from library functions — set `process.exitCode`
  from entry points only.
- Tests colocated in `src/tests/*.mts`, behavior-descriptive names (no
  release-version prefixes).
- Lint output stays clean — zero warnings (inherited from the `crew`
  parent's repo rules).

## Credentials

- No secrets are committed. `.npmrc` carries only the `@astragenie:registry`
  pointer (no `_authToken` key) — actual registry auth token is supplied
  via environment, not this file.
- AstraRunner ingest token (`ingest_token` in `.claude-plugin/plugin.json`
  `userConfig`) is stored in the OS keychain via `bunx astrarunner connect
  <code>` (`src/scripts/cli/connect.mts`) — never written to
  `.claude/loop.json`, which carries only non-secret identifiers (url,
  tenantId, appId).

## Never-do

Merged from both parent plugins' hard rules — everything below still
applies post-merge.

- No CommonJS, no shell-interpreted phase-gate commands — the phase-gate
  runner uses `execFile` with argv arrays only (no injection surface).
- No local Claude Code marketplaces — always register from GitHub
  (`"source": "github"`), never a local path. See
  `crew/.claude/crew/plugin-marketplace.md` (still the rump's copy as of
  this merge phase — not yet promoted to this repo's own `.claude/crew/`).
- No stale pre-transfer owner in authored surfaces (README, ADOPTION,
  `src/`, `docs/`, `commands/`, `skills/`, `agents/` excl. `3rdparty/`,
  `.claude-plugin/`) — the owner is `astragenie`; GitHub's redirect makes
  old refs silently rot undetected (`bun
  ./src/scripts/validate-org-refs.mts` is the CI gate).
- No phantom `crew:<name>` / `runner:<name>` / `devcrew:<name>` dispatch
  tokens in CLAUDE.md — every reference must resolve to a real
  agent/command/skill (`bun ./src/scripts/validate-agent-refs.mts`).
- No hand-edits inside the `<!-- crew:start -->...<!-- crew:end -->` or
  `<!-- runner:start -->...<!-- runner:end -->` marker blocks in
  `CLAUDE.md` — they're regenerated by `/crew:install` /
  `/devcrew:install` respectively; edit `.claude/crew.json` /
  `.claude/loop.json` instead.
- No editing `templates/`, `commands/`, `skills/`, `agents/` content
  casually when the goal is fixing *this repo's own* docs — those ship to
  adopter repos as product surface.
- Never force-push `main`, never delete tags, never skip hooks
  (`--no-verify`) without explicit user request (inherited from the
  `crew` parent's release hard rules — see `docs/memory.md`).
- Never publish a release with failing CI, even if locally green (no
  auto-publish hook exists; releases are user-triggered).
- No commits without the operator asking — sole-operator repo, no
  `dev.stable` opt-in flag is set in this repo (no
  `.claude/crew/deployment.md` exists yet); baseline ask-first commit
  discipline applies to every session, including autonomous-loop slices.
- `C:\work\mega\dev-team` and `C:\work\mega\runner-plugin` are read-only
  reference inputs for this merge — never edit them from work scoped to
  this repo.
