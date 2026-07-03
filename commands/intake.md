---
name: intake
description: "Backlog intake. Free-text mode mechanically creates a new unscored FEAT from prose, then runs the normal PM triage phase to score it. Pending-FEAT mode (legacy) runs two-phase processing: PM scoring (Phase 1) + architect classification (Phase 2). Flags: --deep, --spec, --from-issue, --dry-run."
auto_execute_steps: false
---

## Free-text mode (FEAT-277, corrected FEAT-214)

`/runner:intake "<free text>"` — create a brand-new FEAT from a prose
description, then score it. This is a two-step reality, not a single
LLM call (FEAT-214 item 3 — a CLI subcommand cannot dispatch an LLM per
DEC-011, so the write step and the scoring step are two separate calls):

1. **Create (mechanical, no LLM).** The skill calls
   `loop.mts intake from-text --text "<free text>"`, which writes a
   `FEAT-NNN.md` to `pending/` with `priority: null` (unscored) via the
   same `addFeature` write path every other backlog entry point uses.
   The original free text becomes the FEAT body's `## Description`
   section. Returns `{ featId, priority: null, filePath }`.
2. **Score (LLM, via the normal triage phase).** The skill immediately
   dispatches `runner:pm` against that one new id (same contract as
   `commands/triage.md` / skill `runner:triage`) and runs
   `loop.mts backlog pm-apply --file <results> --ids <featId>` to
   commit the score and move `pending/` → `triaged/`. For P0/P1
   priority (or `--deep`), the same PM dispatch also drafts
   Given-When-Then ACs into the FEAT body (FEAT-277 inline drafting).

`--spec` is NOT implemented at the CLI layer: `intake from-text --spec`
throws a `not_implemented` error rather than writing a wrong artifact
(FEAT-214 AC-3). A 10-section SPEC body needs PM/LLM drafting judgment
the CLI cannot perform on its own — dispatch `runner:pm --spec` directly
from the skill instead, and write the SPEC file from its response.

Flags:

- `--deep` — force AC writing regardless of priority (applies at step 2,
  the PM dispatch; step 1's create call accepts the flag but does not
  act on it)
- `--spec` — not implemented; step 1 throws `not_implemented` (see above)
- `--from-issue <gh-url>` — pull issue body via the existing github-sync
  loader and feed the resulting text through step 1
- `--dry-run` — preview the FEAT id + body step 1 would write, without
  writing anything to disk

Cost guard: halts with `halt_reason: budget_exceeded` if the PM call
(step 2) exceeds `loop.intakeBudgetUsdPerCall` (default 1.50) or
`loop.intakeBudgetTokensPerCall` (default 150000). No silent fallback.

## Pending-FEAT processing mode (unchanged from FEAT-189)

# Intake (FEAT-189 / SLICE-103)

Single slash command that runs the two-phase backlog intake in order. Replaces the manual sequence of `/runner:triage` followed by `/runner:backlog-enrich`. `/runner:backlog-enrich` was removed as a standalone command in v0.53 (hard-break stub redirects to `/runner:intake` — see `src/tests/deleted-skills-stub.test.mts`); `/runner:triage` remains for score-only partial intake.

## When to use

- Fresh `pending/` FEATs that need scoring AND classification before slicing.
- After a `/runner:backlog-add` of multiple new FEATs.
- Any time you want one slash command to take the backlog from `pending/` all the way to `triaged/` with full routing metadata.

When to use the legacy split instead: only-score a batch (no classification yet) via `/runner:triage`. Only-classify-already-triaged is no longer available as a separate step — `/runner:backlog-enrich` was removed in v0.53; run `/runner:intake` (Phase 2 dispatches `runner:architect` immediately after Phase 1 in the same invocation).

## Phase 1 — PM scoring

Run the full contract from `commands/triage.md` (which delegates to skill `runner:triage`). PM scores every pending FEAT across the 5 dimensions; writes `pm_*` + `composite_score` + `autonomous_safe` + `composite_priority` into each FEAT's frontmatter; moves files `pending/` → `triaged/`.

**Halt semantics**: if the PM phase halts for ANY reason (agent error, validation failure, budget exceedance, JSON contract violation), STOP. Do NOT proceed to phase 2. Surface the PM halt JSON exactly as `/runner:triage` would. Phase 2 only runs after a clean PM phase.

## Phase 2 — architect classification

After phase 1 returns success, list every FEAT that just landed in `triaged/`. For each, dispatch `runner:architect` directly (the contract is inlined here — the standalone `commands/backlog-enrich.md` command was removed in v0.53). Architect classifies `tags`, `needs_contract`, `needs_ux` and writes them to the FEAT's frontmatter.

**Decline filter**: skip the architect dispatch for any FEAT whose phase-1 `composite_priority` is `"P4"` — declined FEATs do not need routing tags because they will not be sliced. Count them and include `declined: <count>` in the final summary.

**Failure handling**: a per-FEAT architect failure (timeout, parse error, missing classification fields) does NOT roll back the phase-1 writes for that FEAT. The PM scoring stays. The architect failure is reported as `architect_failed: <count>`; those FEATs can be enriched later by dispatching `runner:architect` directly against the FEAT id (no standalone slash command exists for this since `/runner:backlog-enrich` was removed in v0.53). Phase 2 continues processing the remaining FEATs.

## Final summary

After both phases complete, print one line:

```
Intake: triaged <N> / declined <D> / architect_classified <C> / architect_failed <F>
```

`N` is the count of FEATs that moved through phase 1 (regardless of outcome). `D` is the subset with `composite_priority: "P4"`. `C` is the subset that phase 2 successfully classified. `F` is the subset that phase 2 attempted but failed. Invariant: `N = D + C + F`.

## Why this command exists

The two-step backlog intake was a source of routing drift. Several FEATs (FEAT-167 documented) ended up triaged-but-not-enriched, which caused `/crew:orchestrate-slice` to fall back to AC-text heuristics instead of the FEAT's classification. One slash command kills that footgun.

## Back-compat

- `/runner:triage` — still works, PM-only path. Supports `--ids` for a
  targeted re-score of specific FEATs (the replacement for the old
  `/runner:retriage`, removed in v0.53).
- `/runner:backlog-enrich` — **removed in v0.53.** Hard-break stub
  redirects to `/runner:intake` (see
  `src/tests/deleted-skills-stub.test.mts`). Architect classification
  is Phase 2 of `/runner:intake` now — no standalone command.
- `/runner:intake` — the only path for fresh backlog intake AND the
  only way to run architect classification.

## Refs

- `commands/triage.md` — phase 1 contract source.
- Phase 2 contract — inlined above (this file); no separate contract
  source since `commands/backlog-enrich.md` was removed in v0.53.
- `skills/triage/SKILL.md` — phase 1 implementation skill.
- `agents/pm.md` — phase 1 agent.
- `agents/architect.md` (runner:architect) — phase 2 agent.
