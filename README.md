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
_Dogfood metrics — generated 2026-11-09. Every number below is computed from this repo's own artifacts; regenerate with `bun src/scripts/generate-metrics-band.mts --write`._

| Metric | Value |
|---|---|
| FEATs shipped (done) | 31 |
| Slices closed, last 90 days | 60 |
| Grade average, last 5 slice closes | 0.898 (n=57 total) |
| median per slice-close session scan | $4.978 (mean $10.323, +107.4% divergence) |
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

The second command is this repo's own CI gate (`bun
./src/scripts/validate-memory-config.mts`, CI gate #17 — see
`docs/ci-gates.md`); invoking it via `${CLAUDE_PLUGIN_ROOT}` from another
repo validates that repo's own `.claude/loop.json` the same way.
