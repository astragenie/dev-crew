---
description: Two-phase backlog intake. Phase 1 dispatches the PM agent to score every pending FEAT (5-dimension triage). Phase 2 dispatches loop:architect on each newly-triaged FEAT to classify tags / needs_contract / needs_ux. Replaces the manual /loop:triage + /loop:backlog-enrich split with one invocation.
---

# Intake (FEAT-189 / SLICE-103)

Single slash command that runs the two-phase backlog intake in order. Replaces the manual sequence of `/loop:triage` followed by `/loop:backlog-enrich`. Both legacy commands remain for back-compat and partial-intake scenarios.

## When to use

- Fresh `pending/` FEATs that need scoring AND classification before slicing.
- After a `/loop:backlog-add` of multiple new FEATs.
- Any time you want one slash command to take the backlog from `pending/` all the way to `triaged/` with full routing metadata.

When to use the legacy split instead: only-score a batch (no classification yet), or only-classify already-triaged FEATs.

## Phase 1 — PM scoring

Run the full contract from `commands/triage.md` (which delegates to skill `loop:triage`). PM scores every pending FEAT across the 5 dimensions; writes `pm_*` + `composite_score` + `autonomous_safe` + `composite_priority` into each FEAT's frontmatter; moves files `pending/` → `triaged/`.

**Halt semantics**: if the PM phase halts for ANY reason (agent error, validation failure, budget exceedance, JSON contract violation), STOP. Do NOT proceed to phase 2. Surface the PM halt JSON exactly as `/loop:triage` would. Phase 2 only runs after a clean PM phase.

## Phase 2 — architect classification

After phase 1 returns success, list every FEAT that just landed in `triaged/`. For each, run the contract from `commands/backlog-enrich.md` (which dispatches `loop:architect`). Architect classifies `tags`, `needs_contract`, `needs_ux` and writes them to the FEAT's frontmatter.

**Decline filter**: skip the architect dispatch for any FEAT whose phase-1 `composite_priority` is `"P4"` — declined FEATs do not need routing tags because they will not be sliced. Count them and include `declined: <count>` in the final summary.

**Failure handling**: a per-FEAT architect failure (timeout, parse error, missing classification fields) does NOT roll back the phase-1 writes for that FEAT. The PM scoring stays. The architect failure is reported as `architect_failed: <count>`; those FEATs can be enriched later via `/loop:backlog-enrich`. Phase 2 continues processing the remaining FEATs.

## Final summary

After both phases complete, print one line:

```
Intake: triaged <N> / declined <D> / architect_classified <C> / architect_failed <F>
```

`N` is the count of FEATs that moved through phase 1 (regardless of outcome). `D` is the subset with `composite_priority: "P4"`. `C` is the subset that phase 2 successfully classified. `F` is the subset that phase 2 attempted but failed. Invariant: `N = D + C + F`.

## Why this command exists

The two-step backlog intake was a source of routing drift. Several FEATs (FEAT-167 documented) ended up triaged-but-not-enriched, which caused `/crew:orchestrate-slice` to fall back to AC-text heuristics instead of the FEAT's classification. One slash command kills that footgun.

## Back-compat

- `/loop:triage` — still works, PM-only path.
- `/loop:backlog-enrich` — still works, architect-only on already-triaged FEATs.
- `/loop:intake` — the new merged path, recommended default for fresh backlog intake.

## Refs

- `commands/triage.md` — phase 1 contract source.
- `commands/backlog-enrich.md` — phase 2 contract source.
- `skills/triage/SKILL.md` — phase 1 implementation skill.
- `agents/pm.md` — phase 1 agent.
- `agents/architect.md` (loop:architect) — phase 2 agent.
