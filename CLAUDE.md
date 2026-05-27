# Repo Instructions — hero-crew-autonomous-loop

Claude Code plugin: the Wiggin-Loop methodology layer that sits on top
of the `crew` plugin. Provides HARD RULE blocks, slice scaffold,
phase-gate runner, and the autonomous-development loop primitives.

## Read first

1. `README.md` — what this plugin is, install instructions, pinned release.
2. `ADOPTION.md` — preconditions, backup advice, and a manual install walk-through.
3. `docs/code-conventions.md` — ESM / Node conventions for this repo.
4. `.claude/artifacts/loop/backlog/product-backlog.md` — current roadmap (Phase 3 loop safety + telemetry).
5. `CHANGELOG.md` — recent releases.

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

## CI gates

GitHub Actions runs on every push and PR:

1. `npm ci`
2. `node ./scripts/validate-manifests.mjs`
3. `npm run lint`
4. `npm run format:check`
5. `node --test tests/*.test.mjs`

## Repo conventions

- ESM only (`.mjs`). No CommonJS.
- One responsibility per module; split at ~400 lines.
- Tests colocated in `tests/`, behavior-descriptive file names (no
  release-version prefixes).
- Lint output must be clean. Zero warnings.
- No `process.exit(N)` from library functions — set
  `process.exitCode` from entry points only.

## Backlog discipline

Active backlog under `.claude/artifacts/loop/backlog/{pending,triaged,in-progress,done}/`.
Each FEAT has frontmatter declaring priority, status, and an
`autonomous_safe` flag. The loop only picks
`autonomous_safe: true` items without per-slice human review; creative
items still require a human in the loop on review.

## Safety

Never commit secrets. Never disable hooks (`--no-verify`) without
explicit user request. Never force-push to `main`.

<!-- loop:start -->
<!-- Installed by /loop:install. Edit .claude/loop.json to change stack-specific commands; re-run /loop:install to regenerate this block. The full HARD RULES live at .claude/loop/rules.md so this block stays small in per-session context. -->

## Autonomous Loop — HARD RULES (summary)

This repo runs the Wiggin Loop autonomously. Full rules: `.claude/loop/rules.md`.

- **Run until PASS.** Do not stop for confirmation. Stop only when every acceptance criterion is PASS with evidence, or the work is externally blocked.
- **Marathon mode (default).** Loop walks entire backlog. Stops only on backlog exhaustion, crew `escalated_to_human`, warn-severity pattern alerts, or high-severity cost alerts.
- **Slice start/close ceremony.** Every slice MUST use `/loop:slice start` and `/loop:slice complete`.
- **Dispatch discipline.** Hand work to `/crew:build` subagent; never implement inline except trivial single-line fixups.
- **Auto-continue.** After ceremony, promote next item without asking.

First action when starting the loop: read `.claude/loop/rules.md` → `docs/ai-loop/00-entry/MASTER_PROMPT.md` → `docs/ai-loop/backlog/approved-slices.md`.

<!-- loop:end -->
