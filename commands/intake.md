---
name: intake
description: "Backlog intake. Free-text mode creates a new FEAT/SPEC from prose via PM agent (P0/P1 also drafts ACs inline). Pending-FEAT mode (legacy) runs two-phase processing: PM scoring (Phase 1) + architect classification (Phase 2). Flags: --deep, --spec, --from-issue, --dry-run."
auto_execute_steps: false
---

## Free-text mode (FEAT-277)

`/runner:intake "<free text>"` — create a brand-new FEAT (or SPEC with
`--spec`) from a prose description. The agent reads your text, calls the
PM agent (now extended with AC drafting), and writes a FEAT-NNN.md to
`pending/`. For P0/P1 features, the same agent call also writes
Given-When-Then ACs in the FEAT body.

Implementation: the skill dispatches the PM agent with your text +
flags; the agent returns a JSON payload; the skill calls
`loop.mts intake from-text` to write the file.

Flags:

- `--deep` — force AC writing regardless of priority
- `--spec` — write a SPEC-NNN.md instead, then prompt for decomposition
- `--from-issue <gh-url>` — pull issue body via the existing github-sync
  loader and feed it through intake
- `--dry-run` — preview extracted frontmatter without writing the file

Cost guard: halts with `halt_reason: budget_exceeded` if the PM call
exceeds `loop.intakeBudgetUsdPerCall` (default 1.50) or
`loop.intakeBudgetTokensPerCall` (default 150000). No silent fallback.

## Pending-FEAT processing mode (unchanged from FEAT-189)

# Intake (FEAT-189 / SLICE-103)

Single slash command that runs the two-phase backlog intake in order. Replaces the manual sequence of `/runner:triage` followed by `/runner:backlog-enrich`. Both legacy commands remain for back-compat and partial-intake scenarios.

## When to use

- Fresh `pending/` FEATs that need scoring AND classification before slicing.
- After a `/runner:backlog-add` of multiple new FEATs.
- Any time you want one slash command to take the backlog from `pending/` all the way to `triaged/` with full routing metadata.

When to use the legacy split instead: only-score a batch (no classification yet), or only-classify already-triaged FEATs.

## Phase 1 — PM scoring

Run the full contract from `commands/triage.md` (which delegates to skill `runner:triage`). PM scores every pending FEAT across the 5 dimensions; writes `pm_*` + `composite_score` + `autonomous_safe` + `composite_priority` into each FEAT's frontmatter; moves files `pending/` → `triaged/`.

**Halt semantics**: if the PM phase halts for ANY reason (agent error, validation failure, budget exceedance, JSON contract violation), STOP. Do NOT proceed to phase 2. Surface the PM halt JSON exactly as `/runner:triage` would. Phase 2 only runs after a clean PM phase.

## Phase 2 — architect classification

After phase 1 returns success, list every FEAT that just landed in `triaged/`. For each, run the contract from `commands/backlog-enrich.md` (which dispatches `runner:architect`). Architect classifies `tags`, `needs_contract`, `needs_ux` and writes them to the FEAT's frontmatter.

**Decline filter**: skip the architect dispatch for any FEAT whose phase-1 `composite_priority` is `"P4"` — declined FEATs do not need routing tags because they will not be sliced. Count them and include `declined: <count>` in the final summary.

**Failure handling**: a per-FEAT architect failure (timeout, parse error, missing classification fields) does NOT roll back the phase-1 writes for that FEAT. The PM scoring stays. The architect failure is reported as `architect_failed: <count>`; those FEATs can be enriched later via `/runner:backlog-enrich`. Phase 2 continues processing the remaining FEATs.

## Final summary

After both phases complete, print one line:

```
Intake: triaged <N> / declined <D> / architect_classified <C> / architect_failed <F>
```

`N` is the count of FEATs that moved through phase 1 (regardless of outcome). `D` is the subset with `composite_priority: "P4"`. `C` is the subset that phase 2 successfully classified. `F` is the subset that phase 2 attempted but failed. Invariant: `N = D + C + F`.

## Why this command exists

The two-step backlog intake was a source of routing drift. Several FEATs (FEAT-167 documented) ended up triaged-but-not-enriched, which caused `/crew:orchestrate-slice` to fall back to AC-text heuristics instead of the FEAT's classification. One slash command kills that footgun.

## Back-compat

- `/runner:triage` — still works, PM-only path.
- `/runner:backlog-enrich` — still works, architect-only on already-triaged FEATs.
- `/runner:intake` — the new merged path, recommended default for fresh backlog intake.

## Refs

- `commands/triage.md` — phase 1 contract source.
- `commands/backlog-enrich.md` — phase 2 contract source.
- `skills/triage/SKILL.md` — phase 1 implementation skill.
- `agents/pm.md` — phase 1 agent.
- `agents/architect.md` (runner:architect) — phase 2 agent.
