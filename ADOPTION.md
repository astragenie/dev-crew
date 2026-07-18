# Adoption Checklist — loop

Run through this before invoking `/runner:install` on a new repo or
re-running it on a repo that already has hand-pasted HARD RULE blocks.

## Prerequisites

- **Bun** installed and on `PATH` — the plugin's runtime. `bun --version`
  to check.
- **`crew` plugin** (>= v0.57.0, `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`)
  installed in Claude Code's plugin cache. `crew` must go in first; `loop`
  refuses to install against a missing or too-old crew. There's no separate
  CLI check to hand-run before install — the installer itself does the
  discovery and errors with a clear message if crew isn't found. If you want
  to confirm crew is live before starting, run `/crew:brief-me` (or, once
  `loop` is installed, `/runner:status` — its `crewCli` field is `null` if
  crew isn't discoverable).
- Repo has a `.git/` directory. Install fails fast on non-git targets.
- Repo has a `CLAUDE.md` (created automatically if missing).

## Step 0 — Install the plugins

These are three separate commands. Paste one at a time into the Claude Code
prompt and let each finish before pasting the next — pasting all three
together as one block is a common failure mode and one of them will silently
get swallowed.

```
/plugin marketplace add astragenie/astra-marketplace
/plugin install crew@astra
/plugin install loop@astra
```

## Step 1 — Back up `.claude/`

Cheap insurance, easy to discard:

```bash
cp -r .claude ".claude.backup.$(date -u +%Y%m%dT%H%M%SZ)-pre-autoloop"
```

## Step 2 — Pre-flight checks

1. **CLAUDE.md inspection** — does the repo already have hand-pasted
   `## Autonomous Loop Instruction — HARD RULE` blocks (the pattern some
   repos hand-authored before this plugin existed)? If yes, the installer
   migrates them automatically: extracts phase-gate commands into config,
   strips the ad-hoc blocks, writes the new `<!-- runner:start -->` /
   `<!-- runner:end -->` marker block in their place. Local customizations
   to those blocks beyond stack commands are not preserved — capture them
   first if you need them.
2. **Existing loop-control content** — once installed, files under
   `<aiLoopRoot>/01-loop-control/` and `<aiLoopRoot>/00-entry/` are
   plugin-owned and get overwritten on every re-install (`aiLoopRoot` is a
   config path — see Step 4; the built-in presets default it to
   `.claude/artifacts/loop/ai-loop`, not a `docs/` path). Anything
   hand-authored there should be moved out first.
3. **Backlog content** — `<backlogPath>/{approved-slices,completed-slices,
   product-backlog}.md` are scaffolded only if missing. Existing content is
   preserved verbatim.
4. **Slice content** — `<slicesRoot>/{pending,active,completed}/` are
   user-owned and untouched by re-install.

## Step 3 — Pick a preset

```
/runner:list-presets
```

Current built-ins:

| Preset | Stack |
| --- | --- |
| `dotnet-python` | C# .NET + Aspire + Python LangGraph agents + Terraform (split FE React + BE .NET) |
| `dotnet-only` | C# .NET backend only |
| `dotnet-react` | C# .NET backend + React / Vite frontend |
| `dotnet-typescript-vue` | C# .NET backend + Vue 3 / Vite (TypeScript) + Aspire |
| `typescript-plugin-dev` | TypeScript Claude Code plugin repos — Bun test + manifest validators |
| `typescript-service` | TypeScript Node service / daemon — Fastify, `tsc`, Vitest, JSON-schema contracts |

There is no default preset — `--preset` is required on a first-time install.
If none match closely, install with the closest one and override `stack.*`
commands in `.claude/loop.json` afterward. Presets are install-time
templates only: the chosen preset's content is inlined into
`.claude/loop.json` once, and nothing at runtime re-reads
`scripts/presets/*.json` after that.

## Step 4 — Install

```
/runner:install --preset <name>
```

The installer reports `writes` — the list of files it modified or created.
If ad-hoc-block migration happened, the first entry names the removed block.

## Step 5 — Configure

Edit `.claude/loop.json` and populate the repo-specific fields:

- `productName` — used in `MASTER_PROMPT.md` headings
- `productDescription` — used in `MASTER_PROMPT.md` "Product" section
- `stackDescription` — free-form bullets used in `MASTER_PROMPT.md` "Stack"
- `mandatoryDocs` — array of paths the agent must read before any slice
- `stack.build`, `stack.test`, `stack.frontendBuild`, `stack.infraPlan`,
  `stack.aspireBoot`, `stack.healthchecks` — the phase-gate suite (each
  stage is a `{cmd, args, cwd?}` triple; set a stage to `null` to disable it)

Then re-run install (omit `--preset` — it's read from the existing config)
to regenerate `MASTER_PROMPT.md` from the updated config:

```
/runner:install
```

## Step 6 — Verify

```
/runner:status
```

Should report:

- `preset` set to your chosen preset
- `hasMarkerBlock: true`
- `hasApprovedSlices: true`, `hasMasterPrompt: true`
- `crewCli` populated (not `null`)

Inspect the new files (paths below use this repo's `aiLoopRoot`/
`backlogPath`/`slicesRoot` config values — confirm yours via `/runner:status`
if you customized them):

- `CLAUDE.md` — should contain `<!-- runner:start -->...<!-- runner:end -->`
- `<aiLoopRoot>/01-loop-control/{WIGGIN_LOOP,EVIDENCE_RULES,STOP_CONDITIONS}.md`
- `<aiLoopRoot>/00-entry/{MASTER_PROMPT,SLICE_TEMPLATE}.md`
- `<backlogPath>/{approved-slices,completed-slices,product-backlog}.md`
- `<slicesRoot>/pending/.gitkeep`
- `.claude/loop.json`

## Step 7 — First phase-gate run

Once you've completed a phase of work and your stack commands work in
isolation:

```
/runner:phase-gate --phase 1 --note "initial scaffold"
```

The plugin runs each configured stage, captures all output, writes
`<phaseGateArtifactDir>/phase-1-gate-<date>.md`, and registers the artifact
with the crew workflow state via `crew write-validation-result`.

If it returns `status: FAIL`, read the artifact body for the failing stage's
stdout/stderr tail. Fix the failure, then re-run the gate.

## Step 8 — Commit

```bash
git add CLAUDE.md .claude/loop.json <aiLoopRoot>
git commit -m "loop: install with <preset> preset"
```

Leave the `.claude.backup.*` directory locally for a few days, then delete
once the install is stable.

## Ongoing use

Once configured, `/runner:start` (no args) auto-picks the highest-priority
triaged FEAT and returns a `dispatchInstruction`; `/runner:start FEAT-NNN`
opens a specific one. `/runner:close` runs the atomic close ceremony.
See `README.md` § "Quickstart" for the full day-to-day command list.

## Rollback

If something is wrong:

1. Restore the `.claude/` backup directory
2. Restore CLAUDE.md from git: `git checkout HEAD -- CLAUDE.md`
3. Remove the marker block manually if needed
4. Remove `<aiLoopRoot>/01-loop-control/` and `00-entry/` if you want them
   gone entirely

## Repos that should NOT adopt

- Throwaway / scratch repos — methodology overhead isn't worth it
- Repos already on a stricter in-house autonomous methodology that conflicts
  with the three HARD RULE blocks
- Repos where you can't commit `.claude/` and every contributor would need to
  re-install independently
