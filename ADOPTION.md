# Adoption Checklist — loop

Run through this before invoking `/devcrew:install` on a new repo or
re-running it on a repo that already has hand-pasted HARD RULE blocks.

## Prerequisites

- **Bun** installed and on `PATH` — the plugin's runtime. `bun --version`
  to check.
- **`crew` plugin** (>= v0.57.0, `src/scripts/lib/plugin-identity.mts::MIN_CREW_VERSION`)
  installed in Claude Code's plugin cache. `crew` must go in first; `loop`
  refuses to install against a missing or too-old crew. There's no separate
  CLI check to hand-run before install — the installer itself does the
  discovery and errors with a clear message if crew isn't found. If you want
  to confirm crew is live before starting, run `/devcrew:brief` (or, once
  `loop` is installed, `/devcrew:brief` — its `crewCli` field is `null` if
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
   strips the ad-hoc blocks, writes the new `<!-- devcrew:start -->` /
   `<!-- devcrew:end -->` marker block in their place. Local customizations
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
/devcrew:list-presets
```

Current built-ins:

| Preset | Stack |
| --- | --- |
| `dotnet-python` | C# .NET + Aspire + Python LangGraph agents + Terraform (split FE React + BE .NET) |
| `dotnet-only` | C# .NET backend only |
| `dotnet-react` | C# .NET backend + React / Vite frontend |
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
/devcrew:install --preset <name>
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

Optional but recommended: seed the memory config block with the idempotent
`memory-setup` subcommand. It sets `memory.project` to this repo's own
directory name — the per-repo project-id convention every repo should
follow so astramem recall/capture never collides across repos — plus the
`memory.feedback.creditLoop` shape the `validate-memory-config.mts` gate
expects. See README.md's "Memory integration" section for the full
contract; safe to re-run against an already-configured repo.

```bash
bun "${CLAUDE_PLUGIN_ROOT}/src/scripts/loop.mts" memory-setup --repo "$PWD"
```

Optional: set `loop.qa_gate: "pre-build"` to enable the pre-build QA gate
(independent test-plan authoring before the builder runs, plus a
`test_confidence >= 0.80` close gate). Note the close-refusal enforcement
has a deliberate 3-close warm-up on a fresh repo — the first 3 failing
closes warn and surface a `qaGradeGate` halt badge without blocking, and
only the 4th onward refuses the close (see `docs/halt-badges.md`). Don't
mistake the warn-only window for the gate being inert.

Then re-run install (omit `--preset` — it's read from the existing config)
to regenerate `MASTER_PROMPT.md` from the updated config:

```
/devcrew:install
```

## Step 6 — Verify

```
/devcrew:brief
```

Should report:

- `preset` set to your chosen preset
- `hasMarkerBlock: true`
- `hasApprovedSlices: true`, `hasMasterPrompt: true`
- `crewCli` populated (not `null`)

Inspect the new files (paths below use this repo's `aiLoopRoot`/
`backlogPath`/`slicesRoot` config values — confirm yours via `/devcrew:brief`
if you customized them):

- `CLAUDE.md` — should contain `<!-- devcrew:start -->...<!-- devcrew:end -->`
- `<aiLoopRoot>/01-loop-control/{DEV_CREW_METHOD,EVIDENCE_RULES,STOP_CONDITIONS}.md`
- `<aiLoopRoot>/00-entry/{MASTER_PROMPT,SLICE_TEMPLATE}.md`
- `<backlogPath>/{approved-slices,completed-slices,product-backlog}.md`
- `<slicesRoot>/pending/.gitkeep`
- `.claude/loop.json`

## Step 7 — First phase-gate run

Once you've completed a phase of work and your stack commands work in
isolation:

```
/devcrew:phase-gate --phase 1 --note "initial scaffold"
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

Once configured, `/devcrew:start` (no args) auto-picks the highest-priority
triaged FEAT and returns a `dispatchInstruction`; `/devcrew:start FEAT-NNN`
opens a specific one. `/devcrew:close` runs the atomic close ceremony.
See `README.md` § "Quickstart" for the full day-to-day command list.

## Light reviewer ladder rollout

`/devcrew:install --light` trims the default two-reviewer ladder down to a
single reviewer (Reviewer A) and delegates behavior/test validation to your
CI pipeline, by seeding two keys in `.claude/loop.json`:

- `reviewers.ladder: ["A"]` (default: `["A", "B"]`)
- `loop.validation.satisfiedByReview: true` (default: absent, treated as `false`)

This is the same configuration this repo (`runner-plugin`) and `dev-team`
already run day-to-day. A 2026-08-02 fleet audit found 13 of 15 consumer
repos still on the full `["A", "B"]` ladder with no `satisfiedByReview` —
every slice paying for a builder plus two reviewers plus an independent
validator at full context (one repo, astra-render, measured at a 7
dispatches/slice median, 397k tokens/message, 100% Opus). `--light` exists
so other repos can opt into that cheaper, already-proven configuration
deliberately, instead of copying `.claude/loop.json` by hand.

### When to trim

Trim when the repo has a **real CI test gate** — a CI job that runs the
actual test suite and blocks merge on failure, not just a lint/format
check. `loop.validation.satisfiedByReview: true` retires the dedicated
close-time validator dispatch and treats an evidenced reviewer-approval
badge as sufficient to satisfy the validation gate; CI becomes the thing
that actually proves behavior still works. If that CI gate exists and is
trustworthy, the second reviewer and the separate validator are largely
redundant with what CI already checks on every push.

### When NOT to trim

Keep the full `["A", "B"]` ladder — do not pass `--light` — when:

- **There is no CI test gate.** Nothing else in the pipeline verifies
  behavior, so `satisfiedByReview` would mean nothing independently
  checks that the slice actually works. No CI gate means keeping the
  two-reviewer ladder, full stop.
- **The work is high-risk or creative** — novel design surfaces,
  security-sensitive code, or anything where a second reviewer's
  independent judgment (not just "tests passed") is part of what you're
  paying for, even alongside solid CI.
- **The repo wants independent validation as policy** — e.g. regulated
  environments, or teams that deliberately want a validator artifact kept
  separate from reviewer sign-off, regardless of CI maturity.

### How to apply

- **Fresh install** (no `.claude/loop.json` yet — `--preset` is required
  on a first install either way):

  ```
  /devcrew:install --preset <name> --light
  ```

  The chosen preset's opt-in `light` block is merged over `reviewers` and
  `loop.validation` before the one-time `.claude/loop.json` scaffold write.

- **Already-installed repo** (the common case — most of the fleet
  installed before this flag existed):

  ```
  /devcrew:install --light
  ```

  No `--preset` needed. The installer reads the existing
  `.claude/loop.json` and rewrites only the `reviewers` and
  `loop.validation` keys in place — every other persisted key (hand-edited
  `productName`, `stack` overrides, etc.) is left byte-stable. It sources
  the trimmed values from the repo's own persisted `preset` name; if that
  name isn't resolvable (renamed/removed template, or a hand-authored
  config with no `preset` field at all), it falls back to the same fixed
  values every shipped preset carries (`reviewers.ladder: ["A"]`,
  `loop.validation.satisfiedByReview: true`). Safe to re-run: a repo
  already on the light ladder gets a byte-identical no-op.

  Verify by inspecting `.claude/loop.json` directly — `reviewers.ladder`
  should read `["A"]` and `loop.validation.satisfiedByReview` should read
  `true`.

Omitting `--light` entirely is fully backward compatible: install behaves
exactly as it did before this flag existed.

### How to revert

**Re-running install without `--light` does NOT revert the trim.** Install
only ever *merges the light block in* when `--light` is passed — it never
removes an existing `reviewers` / `loop.validation` setting. Re-running
with `--preset <name>` but no `--light` doesn't revert it either: the
installer only ever writes `.claude/loop.json` when the file doesn't exist
yet — the refresh computes a merge in memory but never persists it, so the
on-disk file (including a previously-trimmed `reviewers.ladder`) is left
completely untouched. There is no
`--unlight` / `--no-light` flag.

The only way back to the full two-reviewer ladder today is a manual edit
of `.claude/loop.json`:

1. Set `reviewers.ladder` back to `["A", "B"]`.
2. Remove `loop.validation.satisfiedByReview`, or set it to `false` (the
   validation gate checks for `=== true` specifically, so either has the
   same effect).

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
