# Adoption Checklist — loop

Run through this before invoking `/loop:install` on a new repo or
re-running it on a repo that already has hand-pasted HARD RULE blocks.

## Prerequisites

- `crew` plugin installed in Claude Code's plugin cache. Verify with
  `node "$(ls -dt $HOME/.claude/plugins/cache/astra/crew/*/scripts/crew.mjs | head -1)" --help`.
- Repo has a `.git/` directory. Install fails fast on non-git targets.
- Repo has a `CLAUDE.md` (will be created if missing).

## Step 1 — Back up `.claude/`

Cheap insurance, easy to discard:

```bash
cp -r .claude ".claude.backup.$(date -u +%Y%m%dT%H%M%SZ)-pre-autoloop"
```

The plugin also writes its own backup hint into commit messages so you can
identify which backup matches which install pass.

## Step 2 — Pre-flight checks

1. **CLAUDE.md inspection** — does the repo already have hand-pasted
   `## Autonomous Loop Instruction — HARD RULE` blocks? If yes, the installer
   will migrate them (extract phase-gate commands into config, strip the
   blocks, write the new marker-bracketed block). If you have local
   customizations to those blocks beyond stack commands, capture them
   first — only the phase-gate commands are extracted.
2. **Existing `docs/architecture/ai-loop/` content** — files under
   `01-loop-control/` and `00-entry/` are plugin-owned and will be
   overwritten on every install. Hand-authored content there should be
   moved into one of the user-owned paths first:
   - `docs/architecture/ai-loop/02-acceptance-gates/` (per-area gate criteria)
   - `docs/architecture/ai-loop/022-product-acceptance-gates/` (journey / completion gates)
   - `docs/architecture/ai-loop/03-*-plan/` (product plan / strategy)
   - `docs/architecture/ai-loop/04-implementation-slices/` (slice files)
   - `docs/architecture/ai-loop/05-review-rubrics/` (review rubrics)
3. **Backlog content** — `backlog/{approved,completed,product-backlog}.md`
   are scaffolded only-if-missing. Existing content is preserved verbatim.
4. **Slice content** — `slices/pending/`, `slices/active/`, `slices/completed/`
   are user-owned and untouched.
5. **Hard dependency on `crew`** — install fails fast if the crew CLI is not
   discoverable. Verify with `crew --help` (after the relevant slash command
   path is wired) or by checking the cache directly.

## Step 3 — Pick a preset

Run `/loop:list-presets` to see the built-ins. v1 ships:

- `dotnet-aspire-python` — C# .NET + Aspire local orchestration + Python
  LangGraph agents + Terraform infra

If none match, install with the closest one and override stack commands in
`.claude/loop.json` afterward.

## Step 4 — Install

```bash
/loop:install --preset dotnet-aspire-python
```

Or directly:

```bash
node "$HOME/.claude/plugins/cache/astra/loop/0.3.1/scripts/loop.mjs" \
  install --repo "$PWD" --preset dotnet-aspire-python
```

The installer reports `writes` — the list of files it modified or created.
If migration happened, the first entry is
`CLAUDE.md (ad-hoc HARD RULE blocks removed)`.

## Step 5 — Configure

Edit `.claude/loop.json` and populate the repo-specific fields:

- `productName` — used in `MASTER_PROMPT.md` headings
- `productDescription` — used in `MASTER_PROMPT.md` "Product" section
- `stackDescription` — free-form bullets used in `MASTER_PROMPT.md` "Stack"
- `mandatoryDocs` — array of paths the agent must read before any slice
- `stack.build`, `stack.test`, `stack.frontendBuild`, `stack.infraPlan`,
  `stack.aspireBoot`, `stack.healthchecks` — the phase-gate suite

Then re-run install to regenerate `MASTER_PROMPT.md` from the updated config:

```bash
/loop:install
```

(The `--preset` flag is optional on re-run; the preset is read from the
existing config.)

## Step 6 — Verify

```bash
/loop:status
```

Should report:

- `preset` set to your chosen preset
- `hasMarkerBlock: true`
- `hasApprovedSlices: true`, `hasMasterPrompt: true`
- `crewCli` populated (not null)

Inspect the new files:

- `CLAUDE.md` — should contain `<!-- loop:start -->...<!-- loop:end -->`
- `docs/architecture/ai-loop/01-loop-control/{WIGGIN_LOOP,EVIDENCE_RULES,STOP_CONDITIONS}.md`
- `docs/architecture/ai-loop/00-entry/{MASTER_PROMPT,SLICE_TEMPLATE}.md`
- `docs/architecture/ai-loop/backlog/{approved-slices,completed-slices,product-backlog}.md`
- `docs/architecture/ai-loop/slices/pending/.gitkeep`
- `.claude/loop.json`

## Step 7 — First phase-gate run

Once you've completed a phase of work and your stack commands work in
isolation:

```bash
/loop:phase-gate --phase 1 --note "initial scaffold"
```

The plugin runs each configured stage, captures all output, writes
`.claude/artifacts/crew/validations/phase-1-gate-<date>.md`, and registers
the artifact with the crew workflow state.

If it returns `status: FAIL`, read the artifact body for the failing stage's
stdout/stderr tail. Fix the failure, then re-run the gate.

## Step 8 — Commit

```bash
git add CLAUDE.md docs/architecture/ai-loop/ .claude/loop.json
git commit -m "loop: install loop@0.1.0 with <preset> preset"
```

Leave the `.claude.backup.*` directory locally for a few days, then delete
once the install is stable.

## Rollback

If something is wrong:

1. Restore the `.claude/` backup directory
2. Restore CLAUDE.md from git: `git checkout HEAD -- CLAUDE.md`
3. Remove the marker block manually if needed
4. Remove `docs/architecture/ai-loop/01-loop-control/` and `00-entry/` if you
   want them gone entirely

## Repos that should NOT adopt

- Throwaway / scratch repos — methodology overhead isn't worth it
- Repos already on a stricter in-house autonomous methodology that conflicts
  with the three HARD RULE blocks
- Repos where you can't commit `.claude/` and every contributor would need to
  re-install independently
