# Repo Instructions — loop

Claude Code plugin: the Wiggin-Loop methodology layer that sits on top
of the `crew` plugin. Provides HARD RULE blocks, slice scaffold,
phase-gate runner, and the autonomous-development loop primitives.

## Read first

1. `README.md` — what this plugin is, install instructions, pinned release.
2. `ADOPTION.md` — preconditions, backup advice, and a manual install walk-through.
3. `docs/code-conventions.md` — ESM / Node conventions for this repo.
4. `docs/sop/specialist-pause-handling.md` — SOP when builder/reviewer/validator subagents pause without writing artifact (recurring 2026-06-06 pattern).
5. `docs/upstream-requests/` — open requests against hero-crew or other upstream plugins; check status before reopening dependent FEATs.
6. `docs/halt-badges.md` — registry of every halt-badge field loop emits in `snapshot.*` (cross-plugin contract per SPEC-003). MUST update when adding a new halt-badge in a future FEAT.
5. `.claude/artifacts/loop/backlog/product-backlog.md` — current roadmap (Phase 3 loop safety + telemetry).
6. `CHANGELOG.md` — recent releases.

## Engineering standards

For language-agnostic patterns and design guidance, consult
[`Astragenie.Standards`](https://github.com/sergeymilashico/Astragenie.Standards)
if it is installed at a sibling path. The ESM conventions are mirrored
at `Astragenie.Standards/docs/javascript/coding-conventions.md`. The
local `docs/code-conventions.md` is self-contained and authoritative
for this repo.

## Hard dependency

This plugin requires the [`crew`](https://github.com/sergeymilashico/hero-crew)
plugin at the version pinned in `scripts/lib/plugin-identity.mjs::MIN_CREW_VERSION`.
`/loop:install` refuses to run against an older crew.

## Local commands

- `npm test` — full test suite (`node --test tests/*.test.mjs`).
- `npm run lint` — ESLint flat config.
- `npm run format` / `npm run format:check` — Prettier.
- `node ./scripts/validate-manifests.mjs` — manifest sanity check.
- `node ./scripts/validate-content-length.mjs` — owned-agent line cap
  (300) + SKILL.md line cap (200). `agents/3rdparty/` exempt.

## CI gates

GitHub Actions runs on every push and PR:

1. `npm ci`
2. `node ./scripts/validate-manifests.mjs`
3. `node ./scripts/validate-content-length.mjs`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run format:check`
7. `node --test tests/*.test.mjs`

Pre-push hook (`scripts/pre-push-validate.mjs`) runs manifest +
content-length + format-check locally before any `git push`.

## Repo conventions

- ESM only (`.mjs`). No CommonJS. Source is `src/scripts/*.mts`; tsc
  emits `scripts/*.mjs` (CI checks `git diff --exit-code scripts/`).
- One responsibility per module; split at ~400 lines.
- Owned `agents/*.md` capped at 300 lines; `skills/**/SKILL.md` capped
  at 200 (enforced by `validate-content-length`). `agents/3rdparty/`
  exempt — vendored, kept as-is to avoid fork-and-trim chores.
- Tests colocated in `src/tests/*.mts` → built to `tests/*.mjs`.
  Behavior-descriptive file names (no release-version prefixes).
- Lint output must be clean. Zero warnings. ESLint cyclomatic
  complexity capped at 15 — reduce by extracting helpers, not by
  suppressing the rule.
- No `process.exit(N)` from library functions — set
  `process.exitCode` from entry points only.
- Runtime-only modules without `.mts` source (e.g. `github-sync/`)
  need ambient `.d.mts` shims under `src/scripts/lib/` so callers
  can drop `@ts-ignore`.

## Backlog discipline

Active backlog under `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT has frontmatter declaring priority, status, and an
`autonomous_safe` flag. The loop only picks
`autonomous_safe: true` items without per-slice human review; creative
items still require a human in the loop on review.

`/loop:backlog-enrich` writes three routing fields into FEAT
frontmatter: `tags`, `needs_contract`, `needs_ux`. Project-level
stack identity (language, framework, contract type, deployment) lives
in `scripts/presets/*.json` and is read at builder-dispatch time via
`node scripts/loop.mjs resolve-skills --variant <fe|be|single>`. See
`docs/superpowers/specs/2026-06-07-preset-driven-skill-activation-design.md`
for the design.

Prior `surface` / `stack` per-FEAT classification was dropped on
feat/preset-skill-activation — preset is sole source. The earlier
upstream-request `docs/upstream-requests/2026-06-07-...orchestrate-slice-surface-stack-routing.md`
is superseded by the resolver CLI (no FEAT-level reader required).

## Decommissioned roles

- `crew:lead` — DECOMMISSIONED 2026-06-07. Loop and crew slash flows
  in this repo route directly to specialist agents
  (`crew:builder`, `crew:builder-fe`, `crew:builder-be`,
  `crew:reviewer`, `crew:validator`, etc.). The lead orchestrator step
  is no longer used. `hooks/guard-feat-dispatch.mjs` blocks
  `crew:lead` dispatches so accidental routing is surfaced. To
  re-enable, restore the agent name to the allowlist and update this
  section.

## Owned agents

Dispatch via `Agent(subagent_type: ...)`. The plugin runtime namespaces
owned agents with the `loop:` prefix — use the namespaced ID, not the
bare frontmatter `name:` field:

- `loop:pm` — backlog scoring across 5 dimensions; `compositePriority:
  "needs-review"` escape valve when scope exceeds PM ability.
- `loop:architect` — read-only Node ESM design + ADR drafter for
  structural change. Use before SLICE-A of any new contract / provider
  / cross-module refactor.
- `loop:researcher` — read-only citation-backed code archaeology + fact
  gathering. Use when a question needs evidence from the repo before a
  change is proposed.
- `loop:document-writer` — Markdown-only docs (README, CHANGELOG, ADR,
  retros, release notes, agent / skill prompts). Will NOT edit source.

## Auto-dispatch primitives

`src/scripts/lib/auto-dispatch.mts` exposes `dispatchAgent`,
`parseSkipFlag`, `appendAuditLog` as opt-in audit infrastructure.
CLI subcommands do NOT auto-dispatch role agents — slash flows are
the contract. See DEC-011 (supersedes DEC-004).

Slash flows that orchestrate role agents:

- `/loop:backlog-enrich` — architect classifies triaged FEATs (tags,
  needs_contract, needs_ux). **Wired to resolver since v0.28.0**: skill
  block from `preset.roles.architect` is prepended to the dispatch prompt.
- `/loop:triage` (via `skills/triage/SKILL.md`) — PM scores pending FEATs.
  **Wired to resolver since v0.28.1**: skill block from `preset.roles.pm`
  is prepended to the dispatch prompt.
- `/loop:backlog-add` — researcher enriches new FEAT body. Auto-dispatch
  was removed in DEC-011; researcher work happens via separate user
  invocation, not inline.
- `/loop:spec-decompose` — agent reads SPEC and identifies features. No
  inline role-agent dispatch from the slash flow itself.
- `/loop:slice-complete` — document-writer drafts CHANGELOG / ADR /
  release notes after slice close. Currently invoked by the orchestrating
  agent, not by the CLI subcommand. Will wire to the resolver when a
  CLI-driven dispatch is added.
- `/loop:slice-from-feature` — dispatches `crew:architect` (not
  `loop:architect`) for contracts. Cross-plugin; wire on hero-crew side.

`dispatchAgent` remains exported for callers that want marker-write
semantics. The marker queue at
`.claude/artifacts/loop/pending-dispatch/` is deprecated for
production use — no consumer is planned (see DEC-011).

Every dispatch (via the function, when used) still appends one JSON
line to `.claude/artifacts/loop/auto-dispatch.jsonl` — audit trail
for cost attribution.

## Safety

Never commit secrets. Never disable hooks (`--no-verify`) without
explicit user request. Never force-push to `main`.

<!-- loop:start -->
<!-- Installed by /loop:install. Edit .claude/loop.json to change stack-specific commands; re-run /loop:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Auto mode (default — `loop.marathonMode: true`).** Loop walks entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts.
- **Slice start/close ceremony.** Every slice MUST use `/loop:slice start` and `/loop:slice complete`.
- **Dispatch discipline.** Hand `dispatchInstruction` to `crew:builder` subagent (implementation only); parent loop dispatches `crew:reviewer` then `crew:validator` after; never implement inline except trivial single-line fixups.
- **Auto-continue.** After ceremony, promote next item without asking.

First action when starting the loop: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.

<!-- loop:end -->

## Project state (auto-generated)

@.claude/artifacts/loop/loop-snapshot.md
